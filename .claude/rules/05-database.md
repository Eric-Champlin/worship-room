---
paths: ["backend/**", "**/*.sql", "**/*.xml"]
---

## Forums Wave Database Standards

**Authority:** The Forums Wave Master Plan (`_forums_master_plan/round3-master-plan.md`) Decision 4 defines the unified `posts` table with a discriminator. All tables use the unified `posts` family (NOT the legacy `prayer_wall_posts` / `prayer_requests` names from older specs — those are superseded).

## Tech Stack

- **Local Development:** PostgreSQL 16 via Docker Compose
- **Production:** PostgreSQL on Railway, Supabase, or Neon (per Spec 1.10b deployment decision)
- **ORM:** Spring Data JPA
- **Migrations:** Liquibase (XML changesets — see `03-backend-standards.md` for naming conventions)
- **Backups:** Automated daily via Spec 1.10c (S3-compatible storage via Spec 1.10e adapter)

## Naming Conventions

- Table names: `snake_case`, plural (e.g., `users`, `posts`, `post_comments`)
- Column names: `snake_case` (e.g., `user_id`, `created_at`, `is_admin`)
- Primary keys: `id UUID` on every table (master plan Universal Rule 3)
- Foreign keys: `{referenced_table_singular}_id` (e.g., `user_id`, `post_id`)
- Timestamps: `created_at`, `updated_at` on every table
- Boolean columns: `is_` prefix (e.g., `is_admin`, `is_banned`, `is_anonymous`)
- Indexes: `idx_{table}_{columns}` (e.g., `idx_posts_user_created`)

## Canonical Table Registry

The following tables are defined by the master plan. Each table's full schema is in the spec that creates it. This registry is the quick-reference for what exists and where it's created.

### Phase 1 — Foundation
| Table | Created In | Purpose |
|-------|-----------|---------|
| `users` | Spec 1.3 (+ 1.10f future) | Core user accounts. **Shipped columns** (Spec 1.3 + 1.3b): email, password_hash, name, is_admin, timezone. **Future columns (Spec 1.10f, NOT yet on table):** terms_version, privacy_version. |

### Phase 2 — Activity Engine
| Table | Created In | Purpose |
|-------|-----------|---------|
| `activity_log` | Spec 2.1 | Per-action log (user_id, activity_type, points_earned, created_at) |
| `faith_points` | Spec 2.2 | Cumulative points + current level per user |
| `streak_state` | Spec 2.3 | Current streak, longest streak, last active date, grace used |
| `user_badges` | Spec 2.4 | Earned badges with timestamps and activity counters |
| `activity_counts` | Spec 2.5 | Pre-aggregated daily/weekly/monthly counts for fast dashboard reads |

### Phase 2.5 — Friends + Social
| Table | Created In | Purpose |
|-------|-----------|---------|
| `friend_relationships` | Spec 2.5.1 | Mutual friendships (composite PK: user_a_id + user_b_id) |
| `friend_requests` | Spec 2.5.1 | Pending/accepted/declined friend requests |
| `social_interactions` | Spec 2.5.1 | Encouragements, nudges, recap dismissals |
| `milestone_events` | Spec 2.5.1 | Streak milestones, level-ups, badge earns |

### Phase 3 — Prayer Wall
| Table | Created In | Purpose |
|-------|-----------|---------|
| `posts` | Spec 3.1 | Unified post table (prayer_request, testimony, question, discussion, encouragement) |
| `post_comments` | Spec 3.1 | Comments on posts |
| `post_reactions` | Spec 3.1 | Reactions (praying, amen, heart, praising, celebrate + Light a Candle composite PK) |
| `post_bookmarks` | Spec 3.1 | User bookmarks on posts |
| `post_reports` | Spec 3.1 | Post-level moderation reports |
| `qotd_questions` | Spec 3.1 (table) + Spec 3.2 (seed) | Question of the Day (72 rotating questions: 60 general + 12 liturgical). Table created by Spec 3.1 changeset 019; 72 rows seeded by Spec 3.2 changeset 021. Spec 3.9 owns the rotation endpoint, not the schema. |

### Phase 6 — Engagement Features
| Table | Created In | Purpose |
|-------|-----------|---------|
| `verse_surfacing_log` | Spec 6.8 | Verse-Finds-You cooldown tracking (user_id, verse_id, surfaced_at, trigger_type) |

### Phase 10 — Community Safety
| Table | Created In | Purpose |
|-------|-----------|---------|
| `user_reports` | Spec 10.7b | User-level pattern-harassment reports |
| `admin_audit_log` | Spec 10.10 | All admin/moderator actions with full audit trail |

### Phase 12 — Notifications
| Table | Created In | Purpose |
|-------|-----------|---------|
| `notifications_inbox` | Spec 12.2 | Per-user notification inbox (14 notification types) |

### Phase 15 — Email
| Table | Created In | Purpose |
|-------|-----------|---------|
| `email_sent_log` | Spec 15.1b | Every email sent per user (dedup + debugging) |
| `email_preferences` | Spec 15.1b | Per-user opt-in/opt-out for each email category |

## Indexes & Constraints

**Every table must have:**
- UUID primary key (`id UUID PRIMARY KEY DEFAULT gen_random_uuid()`)
- `created_at TIMESTAMP NOT NULL DEFAULT NOW()`
- Indexes on columns used in WHERE, ORDER BY, or JOIN clauses
- **`ON DELETE CASCADE`** on foreign keys to `users.id` for child tables whose rows should disappear when the parent user is deleted (per Decision 10 rule 8): `activity_log`, `faith_points`, `streak_state`, `user_badges`, `friend_relationships`, `friend_requests`, `social_interactions`, `milestone_events`, `post_bookmarks`, `email_preferences`

**Common index patterns:**
- `(user_id, created_at DESC)` — for per-user feeds and history
- `(status, created_at DESC)` — for moderation queues
- `(target_type, target_id)` — for polymorphic lookups (audit log)
- Composite unique constraints where business rules demand it (e.g., one reaction per user per post per type)

**CHECK constraints:** Use for enum-like VARCHAR columns to prevent invalid data at the database level:
```sql
CHECK (post_type IN ('prayer_request','testimony','question','discussion','encouragement'))
CHECK (status IN ('pending','reviewing','closed_action','closed_no_action'))
```

### CHECK constraints over `ON DELETE SET NULL` columns (MANDATORY)

**Source of this rule:** Spec 3.1 Plan Deviation #1 (2026-04-28). The `post_reports_review_consistency` CHECK was originally written to require `reviewer_id IS NOT NULL` on closed-status branches. The same table has `fk_post_reports_reviewer ... ON DELETE SET NULL` so deleting a moderator's `users` row preserves the audit trail with `reviewer_id` cleared. PostgreSQL **re-fires CHECK constraints on cascade UPDATE** (cascade SET NULL is implemented as an UPDATE under the hood); the CHECK rejected the cascade-produced row, blocking the moderator delete. Resolution required a follow-on changeset that relaxed the CHECK on closed branches.

**The rule:** Any CHECK constraint that references a column subject to `ON DELETE SET NULL` on a foreign key MUST remain satisfied with that column nulled out. Otherwise the cascade fails at the moment the FK rule fires and the parent DELETE is rejected.

**At schema-design time, ask:**
- Does this table have any FK with `ON DELETE SET NULL`?
- Does any CHECK constraint reference the SET-NULL column directly?
- Would the CHECK still pass if that column became NULL while the rest of the row stayed unchanged?

If the answer to (3) is "no," EITHER move the SET-NULL column out of the CHECK predicate, OR move the invariant the CHECK was enforcing into the application layer. Encoding "this column must be present at action time" via a CHECK over a SET-NULL column is structurally incompatible with the SET-NULL semantics. Either pick CASCADE (the column disappears with the parent) or accept that the column can be nulled (the CHECK must permit NULL).

**`/code-review` MUST flag any new CHECK constraint that references a SET-NULL FK column without explicitly handling the NULL case.**

## Liquibase Seed Data & Value Patterns

**Source of these patterns:** Phase 1 execution (Spec 1.8). Also canonicalized in master plan v2.9 addendum, items 3 and 4. Trust this rule file over any older changeset that predates these patterns.

### Timezoned timestamps — use `valueComputed`, not `valueDate`

Liquibase's `ISODateFormat` does NOT parse the ISO-8601 Z suffix. `valueDate="2026-01-15T10:00:00Z"` produces `ERROR: trailing junk after numeric literal` at migration time. Dropping the Z "works" but silently shifts the stored value by the developer's JVM default timezone (observed +6h drift during Spec 1.8 execution).

**Canonical pattern for `TIMESTAMP WITH TIME ZONE` columns:**

```xml
<column name="created_at"
        valueComputed="TIMESTAMP WITH TIME ZONE '2026-01-15 10:00:00+00'" />
```

- Space between date and time, not T.
- Explicit `+00` UTC offset, not Z.
- `TIMESTAMP WITH TIME ZONE` quoted-literal syntax passes straight through to Postgres as a typed literal, independent of JVM timezone.

**Never use `valueDate` with a Z suffix.** Applies to every seed-data changeset that populates a `TIMESTAMP WITH TIME ZONE` column.

### BCrypt hashes for seed users

BCrypt salts are random — no stable hash exists at planning time. Never embed placeholder hashes in seed-data changesets (the resulting rows would fail login because the hash doesn't match the plaintext). This is DISTINCT from the `DUMMY_HASH` constant in `AuthService` — that constant exists solely to equalize the login endpoint's response time for non-existent emails (anti-enumeration). Seed-data hashes must be real.

**Canonical workflow (post-Spec-1.8):**

1. During planning, add a throwaway `BCryptHashGenerator` test class annotated `@SpringBootTest`, with a `@Test` method that autowires `BCryptPasswordEncoder` and prints `encoder.encode("WorshipRoomDev2026!")` once per seed user.
2. Run the generator once. Copy each printed hash into the Liquibase changeset wrapped in a CDATA section. The CDATA wrapper protects the dollar-sign delimiters in the BCrypt hash from Liquibase's variable substitution:
   ```xml
   <column name="password_hash"><![CDATA[PASTE_BCRYPT_HASH_HERE]]></column>
   ```
   A real BCrypt hash looks like: 60 characters starting with the algorithm prefix (2a, 2b, or 2y), the cost factor (e.g., 10), a 22-character salt, and a 31-character hash, all delimited by dollar signs.
3. **Delete the generator** in the next planning step. It has served its purpose and otherwise pollutes the test suite.
4. After execution, verify with a grep for the algorithm+cost prefix pattern (e.g., count lines matching the BCrypt prefix `2a` at cost `10`) — count must match the seed user count.

### Test-profile context override (no `application-test.properties`)

There is NO `application-test.properties` file in the repo. Tests inherit the dev profile by default via `spring.profiles.default=dev` in `application.properties`. If you tag a dev-seed changeset `context="dev"` and don't override the contexts for tests, dev seed users leak into every test run — breaking `userRepository.deleteAll()` and other assumptions silently.

**Canonical mitigation (post-Spec-1.8):** `AbstractIntegrationTest` and `AbstractDataJpaTest` (both in `backend/src/test/java/com/worshiproom/support/`) each register a `@DynamicPropertySource` method that pins `spring.liquibase.contexts=test` for test runs. Seed-data changesets are tagged `context="dev"`; test-only fixture changesets are tagged `context="test"`. Production runs with no context filter and therefore picks up neither.

If a future spec creates `application-test.properties`, the `@DynamicPropertySource` override in the base classes can be removed; until that happens, the base-class override is the canonical mechanism. See `06-testing.md` § "Testcontainers Setup Pattern" for the full base-class shape.

## Data Retention & Deletion (Spec 10.11)

- **Account deletion flow:** 30-day grace period, then anonymization
- **Posts:** Soft-deleted (content replaced with "[deleted]", user_id set to NULL, timestamps retained)
- **Comments:** Same soft-delete pattern as posts
- **Journal entries:** Hard deleted (encrypted content destroyed)
- **Mood data:** Hard deleted
- **Audit logs:** Retained indefinitely (no user content, only action records)
- **Email logs:** Retained per schedule, purged by scheduled job
- **Verse surfacing log:** 30-day retention, older rows purged by scheduled job

## Encryption Policies

- **Journal entries:** Encrypted at rest at the application layer (not just disk-level)
- **Posts and comments:** NOT encrypted (community content, shared by design)
- **Passwords:** BCrypt with salt (Spring Security default)
- **Key management:** Encryption keys in env vars / secret manager, never in code
- Frontend never sees encryption keys — encrypt/decrypt only on backend

## Dual-Write Migration Pattern (Decision 5)

The Forums Wave uses a phased dual-write migration:
1. **Phase N schema spec:** Creates backend tables via Liquibase
2. **Phase N dual-write spec:** Frontend writes to BOTH localStorage (primary) AND backend (shadow)
3. **Phase N cutover spec:** Flips the feature flag so backend becomes primary, localStorage becomes shadow
4. **Phase N+1:** Backend is source of truth; localStorage reads removed

Each dual-write spec introduces a `VITE_USE_BACKEND_*` env flag (default `false`) that the cutover flips to `true`.

## Legacy Name Reference

The following table names appear in older specs and documentation but are **SUPERSEDED** by Decision 4 (unified `posts` table):

| Old Name (superseded) | New Name (canonical) | Notes |
|----------------------|---------------------|-------|
| `prayer_wall_posts` | `posts` | Unified post table for all 5 post types |
| `prayer_wall_reports` | `post_reports` | Post-level reports |
| `prayer_requests` | `posts WHERE post_type='prayer_request'` | Filtered query, not a separate table |
| `prayer_replies` | `post_comments` | Renamed for clarity |
| `prayer_bookmarks` | `post_bookmarks` | Renamed for consistency |
| `prayer_reactions` | `post_reactions` | Renamed for consistency |
| `mood_selections` | TBD (Phase 3+ mood persistence) | Not yet migrated to new schema |

**If you encounter the old names in code or documentation, use the new canonical names.**
