# Forums Wave: Spec 2.5.1 — Friends + Social Schema (Liquibase)

**Master Plan Reference:** `_forums_master_plan/round3-master-plan.md` → Spec 2.5.1 (line 3216), Decision 8 (line 1131), Phase 2 Execution Reality Addendum
**Branch:** `forums-wave-continued` (stay on this branch — no per-spec sub-branch)
**Date:** 2026-04-27

---

## Affected Frontend Routes

N/A — backend-only spec. No frontend code touched. The four tables this spec creates will be exercised by `FriendsService` (Spec 2.5.2), the friends API endpoints (Spec 2.5.3), and the dual-write wiring (Specs 2.5.4 + 2.5.4b). User-facing behavior does not change in this spec.

---

## Spec Header

- **ID:** `round3-phase02-5-spec01-friends-schema`
- **Size:** M
- **Risk:** Medium (foundation for 7 downstream Phase 2.5 specs; schema mistakes cascade)
- **Prerequisites:** Phase 2 complete ✅ (Specs 2.1–2.10 shipped per recent commits; spec-tracker.md reflects 2.7 ✅ and 2.8–2.10 still ⬜ pending Eric's manual tracker update — the actual code is in main per `git log`).
- **Phase:** 2.5 — Friends + Social Migration (Dual-Write)
- **First spec of Phase 2.5.** Specs 2.5.2 (service/repo), 2.5.3 (API), 2.5.4 (frontend dual-write), 2.5.4b (social/milestone dual-write), 2.5.5 (cutover), 2.5.6 (block), 2.5.7 (mute) all build on this schema.

---

## Goal

Create four PostgreSQL tables that hold Phase 2.5's friends and social-interaction shadow data: `friend_relationships`, `friend_requests`, `social_interactions`, `milestone_events`. Schemas match master plan Decision 8 (lines 1140–1180 for friends; lines 3234+ for social). FK constraints use `ON DELETE CASCADE` per `05-database.md`'s mandatory rule for user-child tables. Backend code that consumes these tables ships in Specs 2.5.2 and 2.5.4b — this spec is schema-only.

This is foundation work. Get the columns, types, constraints, and indexes right; everything else in Phase 2.5 builds on it.

---

## Master Plan Divergences

Three divergences from master plan v2.9 worth flagging. None violate Decision 8; they enrich it with project-standard hardening.

### 1. Changeset filename dates use today's date (2026-04-27), not master plan's "2026-04-16"

The master plan body for Spec 2.5.1 lists changeset filenames as `2026-04-16-001-...` through `2026-04-16-004-...`. Those April 16 dates were aspirational from when the master plan was authored. The canonical pattern (per shipped Specs 1.3, 2.1, 2.10 and the Phase 2 Execution Reality Addendum) is "date when the changeset is authored, with sequential number suffix continued globally."

**Actual filenames for this spec:** `2026-04-27-009-...` through `2026-04-27-012-...`, continuing the globally-unique numeric sequence after the existing eight changesets:

- `2026-04-23-001-create-users-table.xml`
- `2026-04-23-002-add-users-timezone-column.xml`
- `2026-04-25-003-create-activity-log-table.xml`
- `2026-04-25-004-create-faith-points-table.xml`
- `2026-04-25-005-create-streak-state-table.xml`
- `2026-04-25-006-create-user-badges-table.xml`
- `2026-04-25-007-create-activity-counts-table.xml`
- `2026-04-27-008-add-activity-log-backfill-idempotency-index.xml`

Once a changeset ships, its filename is permanent and its MD5 is recorded in `DATABASECHANGELOG`. Future schema changes never edit existing files; they append new ones.

### 2. `TIMESTAMP WITH TIME ZONE` everywhere (Decision 8 says plain `TIMESTAMP`)

Decision 8 says `TIMESTAMP NOT NULL DEFAULT NOW()` for `created_at` columns. The project standard (per shipped users table and Phase 2 changesets) is `TIMESTAMP WITH TIME ZONE`. CC must use `TIMESTAMP WITH TIME ZONE` for all four `created_at` / `responded_at` / `occurred_at` columns. This matches `05-database.md` § "Liquibase Seed Data & Value Patterns" and prevents JVM-timezone drift.

### 3. `friend_requests.message` is `VARCHAR(280)`, not `TEXT`

Decision 8 says `message TEXT NULL`. Tightening to `VARCHAR(280)` matches the mood-text limit elsewhere in the app (friendly-message-sized) and prevents storing arbitrary-length payloads in a column that's user-typed. NULL still allowed (sender may opt to send no message).

### 4. Explicit CHECK constraints on status / interaction_type / event_type and no-self-reference (Decision 8 has them as comments only)

Decision 8 documents the allowed status values as inline SQL comments (`-- 'active', 'blocked'`, `-- 'pending', 'accepted', 'declined', 'cancelled'`). Project convention (per Spec 1.3 `users_display_name_preference_check` and Phase 2's `streak_state_*_nonneg_check` constraints) is to declare these as named CHECK constraints via `<sql>` blocks. CC declares all six CHECK constraints explicitly (4 enum, 2 no-self-reference). The master plan's own acceptance criteria already require explicit CHECKs on `social_interactions.interaction_type` and `milestone_events.event_type` (line 3277–3278) — extending the same pattern to friend_relationships and friend_requests is consistent.

---

## Recon Facts (verified during brief authoring — re-verify suspect ones during execution)

- **Existing changeset directory** `backend/src/main/resources/db/changelog/` has eight changesets plus `master.xml` and `contexts/dev-seed.xml` (verified via `ls`).

- **Existing master.xml is append-only** — `<include>` entries are added in chronological order, never reordered. The `contexts/dev-seed.xml` entry stays last. Verified by reading `master.xml` directly.

- **Existing changeset pattern** (verified via `2026-04-25-003-create-activity-log-table.xml` and `2026-04-25-005-create-streak-state-table.xml`):
  - `<databaseChangeLog>` root with proper `xmlns` + `xsi`
  - One `<changeSet id="<filename-without-xml>" author="worship-room">` per file
  - `<createTable>` with explicit column types and constraints
  - `<addForeignKeyConstraint>` declared OUTSIDE `<createTable>` for FK constraints (NOT inline)
  - Named CHECK constraints declared via `<sql>ALTER TABLE ... ADD CONSTRAINT ... CHECK (...)</sql>` blocks (NOT inline `checkConstraint=` attribute)
  - `<rollback>` block with `<dropTable>` for symmetry — drops cascade to indexes and FKs automatically
  - Comment block at top explaining the spec scope and the "MD5 is permanent once shipped" convention

- **Existing column-type conventions** (verified):
  - UUID primary keys with `defaultValueComputed="gen_random_uuid()"`
  - `TIMESTAMP WITH TIME ZONE` for all timestamps
  - `defaultValueComputed="NOW()"` for `created_at` / `occurred_at` / similar
  - `VARCHAR(N)` for bounded strings
  - `JSONB` for structured payloads (e.g., `activity_log.metadata`)
  - NOT NULL constraints declared via `<constraints nullable="false"/>`

- **Existing `LiquibaseSmokeTest`** at `backend/src/test/java/com/worshiproom/db/LiquibaseSmokeTest.java`:
  - Currently asserts `hasSize(8)` on the `databasechangelog` row count (line 75) — will need to bump to **12** after this spec
  - Pattern for table-existence tests: query `information_schema.columns`, assert column count via `hasSize(N)`, spot-check types
  - Pattern for CHECK rejection tests: `displayNamePreferenceCheckConstraintRejectsInvalidValues` model from Spec 1.3

- **Existing Testcontainers infrastructure** (per Phase 1 Execution Reality Addendum):
  - `AbstractIntegrationTest` — full Spring context tests
  - `AbstractDataJpaTest` — slice tests with `@DataJpaTest + @AutoConfigureTestDatabase(replace = Replace.NONE)`
  - Both share a singleton Postgres container via `TestContainers` utility class
  - Both register `spring.liquibase.contexts=test` via `@DynamicPropertySource`

- **Decision 8** at master plan line 1131 specifies the friends schema verbatim. **Spec 2.5.1 body** at master plan line 3216 specifies the social_interactions and milestone_events schemas verbatim and specifies the four-changeset approach. CC must consult both during recon. The spec body explicitly justifies why all four tables ship together: Phase 12 notification generators and Phase 13 personal analytics both query these tables as source-of-truth from Phase 2.5 onward, so they cannot be missing.

- **Backend test baseline** (post-Phase-2 per CLAUDE.md): ~552 backend tests pass. New tests in this spec target 12–15 additions, bringing total to ~564–567. Wall-clock impact: <2s.

---

## Architectural Decisions

### 1. Four changesets, one per table

Four separate XML files, not one combined file. Reasons:

- Matches the discipline pattern from Specs 1.3 and 2.1 (one file per logical unit).
- Lets a future spec roll back ONE table independently if a design flaw surfaces.
- Easier code review: each file is small and self-contained.

**Filenames** (in order of `master.xml` include):

- `2026-04-27-009-create-friend-relationships-table.xml`
- `2026-04-27-010-create-friend-requests-table.xml`
- `2026-04-27-011-create-social-interactions-table.xml`
- `2026-04-27-012-create-milestone-events-table.xml`

### 2. Schema shape per master plan Decision 8 — verbatim with documented enrichments

CC reads master plan v2.9 line 1131 (Decision 8) and line 3216 (Spec 2.5.1 body) and applies the schemas as described. The three divergences in "Master Plan Divergences" above (TIMESTAMP WITH TIME ZONE, VARCHAR(280) for message, explicit CHECK + no-self-reference constraints) are codified here.

If CC notices any column type or constraint that disagrees with what's in this spec, **MASTER PLAN WINS** unless explicitly listed as an enrichment. Stop and report the discrepancy before writing code; do not silently reconcile.

### 3. Foreign keys with ON DELETE CASCADE

All foreign keys to `users(id)` declare `ON DELETE CASCADE`. Per `05-database.md` § "Indexes & Constraints", these tables are explicitly listed in the canonical CASCADE list: `friend_relationships`, `friend_requests`, `social_interactions`, `milestone_events`. When a user is deleted, all their friend relationships, pending requests, sent encouragements, and milestone history go with them.

Liquibase syntax (matches Phase 2 pattern):

```xml
<addForeignKeyConstraint
  baseTableName="friend_relationships"
  baseColumnNames="user_id"
  constraintName="fk_friend_relationships_user"
  referencedTableName="users"
  referencedColumnNames="id"
  onDelete="CASCADE"/>
```

Tables with two FKs to `users(id)` (e.g., `friend_relationships.user_id` and `friend_relationships.friend_user_id`) declare two `<addForeignKeyConstraint>` blocks. Both cascade.

### 4. CHECK constraints for domain invariants — six named constraints

Add CHECK constraints named explicitly per the existing `streak_state_current_streak_nonneg_check` pattern. Use `<sql>ALTER TABLE ... ADD CONSTRAINT ... CHECK (...)</sql>` blocks, not inline `<constraints checkConstraint="..."/>` attributes (the project convention is the named-via-`<sql>` form).

**Six constraints:**

| Constraint name | Table | Predicate |
|---|---|---|
| `friend_relationships_status_check` | `friend_relationships` | `status IN ('active', 'blocked')` |
| `friend_relationships_no_self_reference` | `friend_relationships` | `user_id <> friend_user_id` |
| `friend_requests_status_check` | `friend_requests` | `status IN ('pending', 'accepted', 'declined', 'cancelled')` |
| `friend_requests_no_self_reference` | `friend_requests` | `from_user_id <> to_user_id` |
| `social_interactions_type_check` | `social_interactions` | `interaction_type IN ('encouragement', 'nudge', 'recap_dismissal')` |
| `milestone_events_type_check` | `milestone_events` | `event_type IN ('streak_milestone', 'level_up', 'badge_earned', 'prayer_count_milestone', 'friend_milestone')` |

### 5. UNIQUE on `friend_requests` is FULL, not partial

Decision 8 line 1180 specifies `UNIQUE (from_user_id, to_user_id)` — full UNIQUE, not partial.

This means: once user A sends a request to user B, A can never send another request to B regardless of how the first one resolved (declined, cancelled, accepted — all the same). The first request row stays in the table forever with whatever final status. Spec 2.5.2's acceptance criterion "Cannot send duplicate request (catches UNIQUE violation, returns 409)" is enforced by this constraint — globally, not just within the pending window.

**Why full UNIQUE rather than partial:** anti-harassment. A user who declined a request once should not have to keep declining the same sender. The product policy is "no second chances for the same sender→recipient pair." If a friendship is later desired, the OTHER party (the original recipient) can send a new request — their `(from_user_id, to_user_id)` pair is distinct.

If CC proposes a partial UNIQUE (`WHERE status = 'pending'`), STOP — this is a Decision 8 violation.

The `friend_requests_unique_sender_recipient` UNIQUE constraint creates its own index automatically — no separate `<createIndex>` needed for `(from_user_id, to_user_id)` lookups.

### 6. Mutual-friendship enforcement is service-layer, not schema-layer

Spec 2.5.2's `FriendsService.acceptRequest` inserts BOTH (A→B) and (B→A) rows into `friend_relationships` with `status='active'`, all inside one `@Transactional`. Block is unidirectional (single row from blocker to blocked). Schema does NOT enforce mutuality — that's a service concern.

If CC proposes a CHECK across two rows, a trigger, or a foreign-key cycle to enforce mutuality, STOP — this is out of scope for 2.5.1 and not how Decision 8 specifies enforcement.

### 7. Status vocabulary differs between tables — intentional

`friend_relationships.status` allows `'active'` and `'blocked'` ONLY. There is no `'accepted'` value at this layer — `'accepted'` is the `friend_requests.status` value that, when set, triggers two `friend_relationships` rows being inserted with `status='active'` (in Spec 2.5.2's service).

If CC proposes adding `'accepted'` to `friend_relationships.status` (mirroring friend_requests), STOP — Decision 8 line 1146 says `'active'`. The two tables use different status vocabularies for a reason: requests have a lifecycle (pending → accepted/declined/cancelled), relationships have a state (active/blocked).

### 8. Column-naming asymmetry: `responded_at` vs `created_at` vs `occurred_at` — intentional

Decision 8 names `friend_requests.responded_at` (NOT `resolved_at`) at line 1178. Set when status transitions to `accepted` / `declined` / `cancelled`. NULL while status is `pending`.

`milestone_events` uses `occurred_at` (NOT `created_at`) per master plan line 3263. `social_interactions` uses `created_at` per line 3247. The asymmetry is intentional: events HAPPEN at a moment; interactions are CREATED.

CC must use the exact column names from the master plan. Easy to typo.

### 9. Indexes — minimal, justified

Master plan Spec 2.5.1 says "indexes for the most common queries" (line 3232) and explicitly calls out four index targets at lines 3250 and 3266. Apply this set with reasoning captured in changeset comments:

**`friend_relationships`:**

- Composite PK `(user_id, friend_user_id)` covers forward-direction lookups (e.g., "who has user X friended?").
- `INDEX (friend_user_id)` — supports reverse-direction lookups ("who friended user Y?", "who blocked user Y?")

**`friend_requests`:**

- `INDEX (to_user_id, status)` — supports the recipient's pending-incoming-requests query
- `INDEX (from_user_id, status)` — supports the sender's pending-outgoing-requests query
- The `friend_requests_unique_sender_recipient` UNIQUE constraint creates its own backing index — no separate `<createIndex>` needed for `(from_user_id, to_user_id)` lookups.

**`social_interactions`:**

- `INDEX (to_user_id, created_at DESC)` — supports the recipient's inbox query (master plan line 3250)
- `INDEX (from_user_id, to_user_id, interaction_type, created_at DESC)` — supports rate-limit window queries: 3 encouragements/friend/day, 1 nudge/friend/week (master plan line 3250)

**`milestone_events`:**

- `INDEX (user_id, occurred_at DESC)` — supports per-user feed lookup (master plan line 3266)
- `INDEX (user_id, event_type, occurred_at DESC)` — supports Spec 2.5.4b's 60-second idempotency window (event_type filter is the dedup discriminator)

Total: 7 indexes (1 + 2 + 2 + 2). Rationale captured in each changeset's leading comment: "indexes match expected query patterns for Spec 2.5.x; add more in a future tuning spec when production query plans reveal need."

The cross-user weekly-recap aggregator index `(occurred_at DESC)` mentioned at master plan line 3266 is **deferred** until Phase 13 actually ships — adding it speculatively wastes write bandwidth. Phase 13 spec (recap analytics) owns that index.

### 10. Rollback blocks for each changeset

Symmetric with Specs 1.3 and 2.1. Each `<changeSet>` ends with:

```xml
<rollback>
  <dropTable tableName="<table>"/>
</rollback>
```

Liquibase drops CHECK constraints, indexes, FK constraints, and UNIQUE constraints transitively when the table itself is dropped — no need to enumerate them in the rollback.

### 11. No JPA entities, no repositories, no services

This spec is migration-only. Specs 2.5.2 and 2.5.4b add the Java code that consumes these tables. Adding any of that here is scope creep that breaks the spec sequencing.

### 12. Master changelog is append-only

Add four new `<include>` entries to `master.xml` at the end of the existing changeset list (after `2026-04-27-008-...`), before the `contexts/dev-seed.xml` entry which stays last. Do NOT reorder existing entries. Do NOT modify existing entries.

### 13. No Liquibase contexts on these new changesets

These tables must materialize in dev, test, AND prod profiles — same posture as the existing tables. Do NOT add `context="dev"` or `context="test"` to any of the four new changesets. Contexts are reserved for seed-data changesets per `05-database.md` § "Test-profile context override."

### 14. No seed data

Phase 2.5 has no friend or social-interaction seed data. The 5 dev-seed users from Spec 1.8 exist but no friendships are seeded between them. Spec 2.5.2's recon will decide whether to add seed friendships — that's its call, not 2.5.1's.

---

## Files to Create

All paths under `backend/src/main/resources/db/changelog/`:

### `2026-04-27-009-create-friend-relationships-table.xml`

Columns per master plan Decision 8 line 1140 (with project-standard TIMESTAMP WITH TIME ZONE):

- `user_id` (UUID NOT NULL, FK to `users(id)` with `ON DELETE CASCADE`, part of composite PK)
- `friend_user_id` (UUID NOT NULL, FK to `users(id)` with `ON DELETE CASCADE`, part of composite PK)
- `status` (VARCHAR(20) NOT NULL) — `'active'` or `'blocked'`
- `created_at` (TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW())

Composite primary key `(user_id, friend_user_id)`. Two FK declarations (one per UUID column). Two CHECK constraints (`friend_relationships_status_check`, `friend_relationships_no_self_reference`). One reverse-direction index `idx_friend_relationships_friend_user`. Rollback block.

### `2026-04-27-010-create-friend-requests-table.xml`

Columns per master plan Decision 8 line 1147 (with VARCHAR(280) for message and TIMESTAMP WITH TIME ZONE):

- `id` (UUID PK, `defaultValueComputed="gen_random_uuid()"`)
- `from_user_id` (UUID NOT NULL, FK to `users(id)` with `ON DELETE CASCADE`)
- `to_user_id` (UUID NOT NULL, FK to `users(id)` with `ON DELETE CASCADE`)
- `status` (VARCHAR(20) NOT NULL DEFAULT 'pending') — `'pending'` / `'accepted'` / `'declined'` / `'cancelled'`
- `message` (VARCHAR(280) NULL)
- `created_at` (TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW())
- `responded_at` (TIMESTAMP WITH TIME ZONE NULL)

Two FK declarations. UNIQUE constraint `friend_requests_unique_sender_recipient` on `(from_user_id, to_user_id)` — FULL, not partial. Two CHECK constraints (`friend_requests_status_check`, `friend_requests_no_self_reference`). Two indexes (`idx_friend_requests_to_user_status`, `idx_friend_requests_from_user_status`). Rollback block.

### `2026-04-27-011-create-social-interactions-table.xml`

Columns per master plan line 3236:

- `id` (UUID PK, `defaultValueComputed="gen_random_uuid()"`)
- `from_user_id` (UUID NOT NULL, FK to `users(id)` with `ON DELETE CASCADE`)
- `to_user_id` (UUID NOT NULL, FK to `users(id)` with `ON DELETE CASCADE`)
- `interaction_type` (VARCHAR(20) NOT NULL) — `'encouragement'` / `'nudge'` / `'recap_dismissal'`
- `payload` (JSONB NULL) — encouragement: `{ preset_message_id, preset_text }`; nudge: `{}`; recap_dismissal: `{ week_start_date }`
- `created_at` (TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW())

Two FK declarations. One CHECK constraint (`social_interactions_type_check`). Two indexes (`idx_social_interactions_to_user_created`, `idx_social_interactions_pair_type_created`). Rollback block.

### `2026-04-27-012-create-milestone-events-table.xml`

Columns per master plan line 3254:

- `id` (UUID PK, `defaultValueComputed="gen_random_uuid()"`)
- `user_id` (UUID NOT NULL, FK to `users(id)` with `ON DELETE CASCADE`)
- `event_type` (VARCHAR(40) NOT NULL) — `'streak_milestone'` / `'level_up'` / `'badge_earned'` / `'prayer_count_milestone'` / `'friend_milestone'`
- `event_metadata` (JSONB NULL)
- `occurred_at` (TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW())

One FK declaration. One CHECK constraint (`milestone_events_type_check`). Two indexes (`idx_milestone_events_user_occurred`, `idx_milestone_events_user_type_occurred`). Rollback block.

---

## Files to Modify

### `backend/src/main/resources/db/changelog/master.xml`

Append four new `<include>` lines after the existing `2026-04-27-008-...` entry, before the `contexts/dev-seed.xml` entry. The dev-seed entry stays last. Do not edit or reorder existing entries.

### `backend/src/test/java/com/worshiproom/db/LiquibaseSmokeTest.java`

Three changes:

1. **Update `liquibaseChangelogRecordsAllChangesets`** — bump `hasSize(8)` to `hasSize(12)`, and append four additional row assertions verifying each new changeset's id, author, and filename suffix. Existing eight assertions stay verbatim.

2. **Add a new test method per new table:**
   - `friendRelationshipsTableExistsWithExpectedColumnsAndCompositePK`
   - `friendRequestsTableExistsWithExpectedColumnsAndUnique`
   - `socialInteractionsTableExistsWithExpectedColumns`
   - `milestoneEventsTableExistsWithExpectedColumns`

   Each follows the pattern of existing table-existence tests: query `information_schema.columns`, assert column count and ordering via `containsExactly`, spot-check 2–3 specific column types (UUID, TIMESTAMP WITH TIME ZONE, JSONB where applicable). For `friend_relationships`, query `information_schema.table_constraints` to verify the primary key spans both columns. For `friend_requests`, query the same to verify the UNIQUE constraint covers `(from_user_id, to_user_id)`.

3. **Add CHECK and UNIQUE constraint enforcement tests** — modeled on the existing `displayNamePreferenceCheckConstraintRejectsInvalidValues`. Cover (CC's call: parameterize OR enumerate):
   - Inserting `friend_relationships` with `status='accepted'` fails with CHECK violation (Decision 8 most-common-mistake test)
   - Inserting `friend_relationships` with `user_id = friend_user_id` fails with CHECK violation
   - Inserting `friend_requests` with status outside the four allowed values fails
   - Inserting `friend_requests` with `from_user_id = to_user_id` fails
   - **Full UNIQUE blocks re-request after decline:** insert request A→B with `status='pending'`, update to `status='declined'`, attempt to insert another A→B request — second insert fails with unique violation. (Headline test for Decision 8's anti-harassment policy.)
   - **Full UNIQUE blocks re-request after cancel:** same shape with cancel
   - Inserting `social_interactions` with `interaction_type='spam'` fails CHECK
   - Inserting `milestone_events` with `event_type='unknown_event'` fails CHECK
   - Deleting a user from `users` cascades to delete their rows in all four tables (one cascade test per table)

**No new test classes outside `LiquibaseSmokeTest`** for this spec. The smoke test extension covers schema verification; no JPA entity tests yet because there are no entities.

---

## Files to Delete

None.

---

## Database Changes (Liquibase)

| Filename | Action |
|---|---|
| `2026-04-27-009-create-friend-relationships-table.xml` | NEW — creates `friend_relationships` + composite PK + 2 CHECK + 2 FK CASCADE + 1 reverse index |
| `2026-04-27-010-create-friend-requests-table.xml` | NEW — creates `friend_requests` + full UNIQUE + 2 CHECK + 2 FK CASCADE + 2 indexes |
| `2026-04-27-011-create-social-interactions-table.xml` | NEW — creates `social_interactions` + 1 CHECK + 2 FK CASCADE + 2 indexes |
| `2026-04-27-012-create-milestone-events-table.xml` | NEW — creates `milestone_events` + 1 CHECK + 1 FK CASCADE + 2 indexes |
| `master.xml` | MODIFIED — four `<include>` entries appended in numeric order |
| `LiquibaseSmokeTest.java` | MODIFIED — count bump 8→12 + four table-existence tests + constraint rejection tests |

---

## API Changes

None. This spec creates no endpoints. `GET /api/v1/users/me/friends` and the rest of the friends API are Spec 2.5.3.

---

## Copy Deck

N/A — no user-facing copy. Schema-only spec.

---

## Anti-Pressure Copy Checklist

N/A — no user-facing copy. Universal Rule 12 still binds future Phase 2.5 specs that surface this data; this spec produces no UI.

---

## Anti-Pressure Design Decisions

N/A — schema only. The encouragement/nudge rate limits (3-per-friend-per-day, 1-per-friend-per-week per master plan line 3193) live in Spec 2.5.4b's service code. This spec just provides the columns those services will write to.

---

## Acceptance Criteria

### Schema correctness

- [ ] Four new XML changeset files exist at the canonical paths under `backend/src/main/resources/db/changelog/`
- [ ] Each changeset uses the established Specs 1.3 + 2.1 pattern: `databaseChangeLog` root, single `changeSet` per file, `<createTable>` with explicit types, `<addForeignKeyConstraint>` outside `<createTable>`, named CHECK constraints via `<sql>` blocks, rollback block with `<dropTable>`
- [ ] `friend_relationships` table created with composite PK `(user_id, friend_user_id)`, CHECK `status IN ('active', 'blocked')`, no-self-reference CHECK, `ON DELETE CASCADE` on both FKs to `users(id)`
- [ ] `friend_requests` table created with UUID PK, **FULL UNIQUE constraint on `(from_user_id, to_user_id)`** (not partial), CHECK `status IN ('pending', 'accepted', 'declined', 'cancelled')`, no-self-reference CHECK, `ON DELETE CASCADE` on both FKs, `responded_at` column nullable, `message` is `VARCHAR(280)`
- [ ] `social_interactions` table created with UUID PK, CHECK `interaction_type IN ('encouragement', 'nudge', 'recap_dismissal')`, `ON DELETE CASCADE` on both FKs, `payload` JSONB nullable
- [ ] `milestone_events` table created with UUID PK, CHECK `event_type IN ('streak_milestone', 'level_up', 'badge_earned', 'prayer_count_milestone', 'friend_milestone')`, `ON DELETE CASCADE` on FK, `event_metadata` JSONB nullable, `occurred_at` (not `created_at`) timestamp column
- [ ] All seven indexes created (1 on `friend_relationships`, 2 on `friend_requests`, 2 on `social_interactions`, 2 on `milestone_events`)
- [ ] All four `<rollback>` blocks DROP TABLE successfully and the migration can re-apply

### Liquibase mechanics

- [ ] `master.xml` includes all four new changesets in numeric order (009, 010, 011, 012), appended after `2026-04-27-008-...` and before `contexts/dev-seed.xml`
- [ ] `master.xml` edit is append-only (no existing entries modified)
- [ ] No checksum conflicts with existing changesets through `2026-04-27-008`
- [ ] All four changesets apply cleanly against an empty database (verified via `LiquibaseSmokeTest`)
- [ ] No `context="dev"` or `context="test"` on any of the four new changesets

### Constraint enforcement (Testcontainers integration tests)

- [ ] Inserting `friend_relationships` with `status='accepted'` fails with CHECK constraint violation (catches Decision 8's most common past mistake — `'accepted'` is for friend_requests, not friend_relationships)
- [ ] Inserting `friend_relationships` with `user_id = friend_user_id` fails with CHECK constraint violation
- [ ] Inserting `friend_requests` with status outside the four allowed values fails
- [ ] **Full UNIQUE blocks re-request after decline:** insert request A→B with `status='pending'`, update to `status='declined'`, attempt to insert another A→B request — second insert fails with unique violation
- [ ] **Full UNIQUE blocks re-request after cancel:** same shape with cancel instead of decline
- [ ] Inserting `social_interactions` with `interaction_type='spam'` fails CHECK
- [ ] Inserting `milestone_events` with `event_type='unknown_event'` fails CHECK
- [ ] Deleting a user from `users` cascades to delete all their rows in all four tables (verify per-table)

### Test count target

Per `06-testing.md` § "Test Count Expectations" (M-sized spec → 10–20 tests), target **12–15 tests** covering schema shape, constraint enforcement, cascade behavior, and Liquibase rollback. Backend baseline ~552 → ~564–567 post-spec.

### Build health

- [ ] `./mvnw test` passes ALL tests with the new schema in place; no existing test regresses (baseline ~552 → ~564–567)
- [ ] `./mvnw compile` clean
- [ ] No JPA entities created
- [ ] No service or controller code introduced
- [ ] No frontend changes
- [ ] No new dependency in `pom.xml`
- [ ] No env var added
- [ ] No `application-{profile}.properties` change
- [ ] Spring Boot starts cleanly in dev profile with the new schema (manual verification by Eric post-merge against the docker-compose Postgres container)

---

## Testing Notes

**Test class:** `LiquibaseSmokeTest` (extending the existing tests with new methods).

**Baseline:** ~552 backend tests pass post-Phase-2 per CLAUDE.md. New methods bring count to ~564–567 (depending on whether CC parameterizes the constraint-rejection tests or enumerates them). Wall-clock impact: <2s for the new tests (no fixtures, just DDL inspection via `JdbcTemplate` against the test container).

**Acceptance:** all pre-existing tests still pass, new tests all green, no flake introduced. Whole backend test suite runs in roughly the existing ~110s baseline (per CLAUDE.md).

**Base class:** Use `AbstractDataJpaTest` for the new constraint-enforcement tests if they only need raw `JdbcTemplate` access. Use `AbstractIntegrationTest` (current `LiquibaseSmokeTest` base) if integration with the full Spring context is needed. The existing smoke test extends `AbstractIntegrationTest` — keep that base for the new methods to avoid splitting the test class.

**Rollback testing:** rollback blocks are not exercised in test (Liquibase rollback is a manual operator action via `liquibase rollback`); the rollback blocks are validated by Liquibase's XML parser at startup, which is sufficient for this spec.

**Reactive store consumer pattern:** N/A — schema-only spec, no frontend store touched.

---

## Notes for Plan Phase Recon

**Mandatory reads during `/plan-forums`:**

1. Master plan Decision 8 (line 1131) for the verbatim friends schema — every column type and nullability MUST match the documented enrichments above.
2. Master plan Spec 2.5.1 body (line 3216) for the social_interactions and milestone_events schemas verbatim.
3. `backend/src/main/resources/db/changelog/2026-04-25-003-create-activity-log-table.xml` — canonical pattern for FK CASCADE + indexes.
4. `backend/src/main/resources/db/changelog/2026-04-25-005-create-streak-state-table.xml` — canonical pattern for named CHECK constraints via `<sql>` blocks.
5. `backend/src/main/resources/db/changelog/master.xml` to confirm append-only ordering (verified above to have eight entries; new entries land at the end before `contexts/dev-seed.xml`).
6. `backend/src/test/java/com/worshiproom/db/LiquibaseSmokeTest.java` — current `hasSize(8)` count and the existing assertion patterns for column existence and CHECK rejection.
7. `backend/src/test/java/com/worshiproom/support/AbstractIntegrationTest.java` — the base class the smoke test extends (no changes needed; just confirm the singleton container model).
8. `.claude/rules/03-backend-standards.md` § Liquibase Standards — naming, rollback rule, ON DELETE CASCADE rule.
9. `.claude/rules/05-database.md` § Canonical Table Registry Phase 2.5 — confirms the four tables ARE the canonical names. (Already accurate; no rule-file edit needed for this spec.)
10. `.claude/rules/06-testing.md` § Testcontainers Setup Pattern — the singleton container shape this test relies on.

**Pre-execution verification:** Docker running, Postgres container up. The test suite uses Testcontainers (auto-starts its own container). For `./mvnw spring-boot:run` to apply the migrations against the dev database, the docker-compose Postgres container must be running.

**Plan size expectation:** 7–10 steps. If the plan comes back with 12+ steps or proposes JPA entities, repositories, services, controllers, the friends API, `openapi.yaml` edits, or any code beyond changesets and the smoke test, push back hard — those are explicit guardrail violations. See "Out of Scope" below.

**What to watch for in execution:**

- `'accepted'` proposed in `friend_relationships.status` enum — STOP, Decision 8 line 1146 says `'active'`. The two tables use different vocabularies.
- Partial UNIQUE proposed on `friend_requests` (e.g., `WHERE status = 'pending'`) — STOP, Decision 8 line 1180 specifies FULL UNIQUE. Anti-harassment policy.
- `resolved_at` proposed instead of `responded_at` — STOP, Decision 8 line 1178 names it `responded_at`.
- `created_at` proposed on `milestone_events` instead of `occurred_at` — STOP, master plan line 3263 names it `occurred_at`. The asymmetry vs. `social_interactions.created_at` is intentional.
- Schema-layer mutuality enforcement (CHECK across rows, trigger, FK cycle) — STOP, Decision 8 specifies service-layer enforcement (Spec 2.5.2).
- `ON DELETE SET NULL` proposed for `milestone_events.user_id` ("preserve milestone history") — STOP, `05-database.md` lists it explicitly in the CASCADE list.
- Any changeset filename outside the `2026-04-27-009` through `2026-04-27-012` range, or any reuse of an existing prefix — STOP, prefixes must be globally unique per `03-backend-standards.md`.
- Any consolidated changeset combining multiple tables — STOP, one logical change per changeset (Spec 1.3 + 2.1 precedent).
- `<includeAll>` proposed for `master.xml` — STOP, the existing pattern is explicit `<include>` per file in chronological order.
- macOS smart-quote autocorrect on shell commands in any docs CC produces — single quotes in any inline command examples.

---

## Out of Scope

- JPA entities, repositories, services, controllers (all → Spec 2.5.2)
- API endpoints (→ Spec 2.5.3)
- Frontend dual-write wiring (→ Spec 2.5.4)
- Social-interactions and milestone-events write paths (→ Spec 2.5.4b)
- Block user feature (→ Spec 2.5.6 — schema supports it via `friend_relationships.status='blocked'`, but the feature flow lives in 2.5.6)
- Mute user feature (→ Spec 2.5.7 — entirely separate, has its own table to be designed)
- Seed data for friends/social — none in this spec
- Backfill from existing `wr_friends` localStorage — Phase 2.5 cutover (Spec 2.5.5) handles cutover; backfill is out of scope unless 2.5.5's recon decides we need it
- Cross-user weekly-recap aggregator index (master plan line 3266 mentions `(occurred_at DESC)`) — deferred to Phase 13 spec that actually queries it

---

## Out-of-Band Notes for Eric

- Clean schema-only spec. ~12–15 tests, ~150 lines of changeset XML, ~5 lines of master.xml edit. Should execute in 1–2 sessions.
- After this ships, update `_forums_master_plan/spec-tracker.md` with `2.5.1 ✅` and total Phase 2.5 progress as 1/8. (Tracker is also still showing 2.8/2.9/2.10 as ⬜ even though commits show them shipped — separate manual cleanup.)
- The four schemas this creates already appear in `05-database.md`'s Canonical Table Registry under "Phase 2.5 — Friends + Social, Created In: Spec 2.5.1" — that registry entry is already accurate, no rule-file edit needed for this spec.
- If CC's recon questions whether `friend_relationships.status='accepted'` should be allowed for backward-compatibility with anything in the existing `wr_friends` localStorage shape: the answer is NO. The frontend `wr_friends.friends[]` shape doesn't have a status field at all (entries in that array are implicitly "active"). The dual-write in Spec 2.5.4 will INSERT with `status='active'` directly. No translation layer needed.
- Spec 2.5.2 will need a `FriendsService.acceptRequest` method that updates `friend_requests.status='accepted'`, sets `responded_at=NOW()`, and inserts two `friend_relationships` rows with `status='active'` — all inside one `@Transactional`. Worth flagging during 2.5.2's recon so CC plans the transaction shape.
- The `friend_requests_unique_sender_recipient` UNIQUE constraint will throw `org.springframework.dao.DataIntegrityViolationException` on a duplicate INSERT. Spec 2.5.2's `FriendsService.sendRequest` should catch that and translate to a domain exception that the controller layer maps to HTTP 409 CONFLICT. Worth flagging.
