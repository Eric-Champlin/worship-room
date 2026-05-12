package com.worshiproom.db;

import com.worshiproom.support.AbstractIntegrationTest;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.jdbc.core.JdbcTemplate;

import java.util.List;
import java.util.Map;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/**
 * Smoke test verifying Liquibase applies cleanly against a fresh PostgreSQL 16 container
 * and the canonical users table (Spec 1.3) materializes with the expected shape.
 *
 * <p>Requires Docker to be running locally. Matches the pattern documented in
 * {@code .claude/rules/06-testing.md} § Testcontainers Setup Pattern.
 */
class LiquibaseSmokeTest extends AbstractIntegrationTest {

    @Autowired
    private JdbcTemplate jdbcTemplate;

    @Test
    void usersTableExistsWithAllDecision3Columns() {
        List<Map<String, Object>> columns = jdbcTemplate.queryForList(
            "SELECT column_name, data_type, is_nullable FROM information_schema.columns " +
            "WHERE table_schema = 'public' AND table_name = 'users' " +
            "ORDER BY ordinal_position"
        );

        assertThat(columns).hasSize(27);
        assertThat(columns).extracting("column_name")
            .containsExactly(
                "id", "email", "password_hash", "first_name", "last_name",
                "display_name_preference", "custom_display_name", "avatar_url", "bio",
                "favorite_verse_reference", "favorite_verse_text",
                "is_admin", "is_banned", "is_email_verified",
                "joined_at", "last_active_at", "created_at", "updated_at",
                "is_deleted", "deleted_at",
                "timezone",
                "terms_version", "privacy_version",
                "failed_login_count", "failed_login_window_start", "locked_until",
                "session_generation"
            );

        Map<String, Object> idColumn = columns.stream()
            .filter(c -> "id".equals(c.get("column_name"))).findFirst().orElseThrow();
        assertThat(idColumn.get("data_type")).isEqualTo("uuid");
        assertThat(idColumn.get("is_nullable")).isEqualTo("NO");

        Map<String, Object> emailColumn = columns.stream()
            .filter(c -> "email".equals(c.get("column_name"))).findFirst().orElseThrow();
        assertThat(emailColumn.get("data_type")).isEqualTo("character varying");
        assertThat(emailColumn.get("is_nullable")).isEqualTo("NO");

        Map<String, Object> createdAtColumn = columns.stream()
            .filter(c -> "created_at".equals(c.get("column_name"))).findFirst().orElseThrow();
        assertThat(createdAtColumn.get("data_type")).isEqualTo("timestamp with time zone");

        Map<String, Object> displayPrefColumn = columns.stream()
            .filter(c -> "display_name_preference".equals(c.get("column_name"))).findFirst().orElseThrow();
        assertThat(displayPrefColumn.get("is_nullable")).isEqualTo("NO");
    }

    @Test
    void liquibaseChangelogRecordsAllChangesets() {
        List<Map<String, Object>> rows = jdbcTemplate.queryForList(
            "SELECT id, author, filename FROM databasechangelog ORDER BY orderexecuted"
        );
        assertThat(rows).hasSize(29);

        Map<String, Object> first = rows.get(0);
        assertThat(first.get("id")).isEqualTo("2026-04-23-001-create-users-table");
        assertThat(first.get("author")).isEqualTo("worship-room");
        assertThat((String) first.get("filename"))
            .endsWith("2026-04-23-001-create-users-table.xml");

        Map<String, Object> second = rows.get(1);
        assertThat(second.get("id")).isEqualTo("2026-04-23-002-add-users-timezone-column");
        assertThat(second.get("author")).isEqualTo("worship-room");
        assertThat((String) second.get("filename"))
            .endsWith("2026-04-23-002-add-users-timezone-column.xml");

        Map<String, Object> third = rows.get(2);
        assertThat(third.get("id")).isEqualTo("2026-04-25-003-create-activity-log-table");
        assertThat(third.get("author")).isEqualTo("worship-room");
        assertThat((String) third.get("filename"))
            .endsWith("2026-04-25-003-create-activity-log-table.xml");

        Map<String, Object> fourth = rows.get(3);
        assertThat(fourth.get("id")).isEqualTo("2026-04-25-004-create-faith-points-table");
        assertThat(fourth.get("author")).isEqualTo("worship-room");
        assertThat((String) fourth.get("filename"))
            .endsWith("2026-04-25-004-create-faith-points-table.xml");

        Map<String, Object> fifth = rows.get(4);
        assertThat(fifth.get("id")).isEqualTo("2026-04-25-005-create-streak-state-table");
        assertThat(fifth.get("author")).isEqualTo("worship-room");
        assertThat((String) fifth.get("filename"))
            .endsWith("2026-04-25-005-create-streak-state-table.xml");

        Map<String, Object> sixth = rows.get(5);
        assertThat(sixth.get("id")).isEqualTo("2026-04-25-006-create-user-badges-table");
        assertThat(sixth.get("author")).isEqualTo("worship-room");
        assertThat((String) sixth.get("filename"))
            .endsWith("2026-04-25-006-create-user-badges-table.xml");

        Map<String, Object> seventh = rows.get(6);
        assertThat(seventh.get("id")).isEqualTo("2026-04-25-007-create-activity-counts-table");
        assertThat(seventh.get("author")).isEqualTo("worship-room");
        assertThat((String) seventh.get("filename"))
            .endsWith("2026-04-25-007-create-activity-counts-table.xml");

        Map<String, Object> eighth = rows.get(7);
        assertThat(eighth.get("id")).isEqualTo("2026-04-27-008-add-activity-log-backfill-idempotency-index");
        assertThat(eighth.get("author")).isEqualTo("worship-room");
        assertThat((String) eighth.get("filename"))
            .endsWith("2026-04-27-008-add-activity-log-backfill-idempotency-index.xml");

        Map<String, Object> ninth = rows.get(8);
        assertThat(ninth.get("id")).isEqualTo("2026-04-27-009-create-friend-relationships-table");
        assertThat(ninth.get("author")).isEqualTo("worship-room");
        assertThat((String) ninth.get("filename"))
            .endsWith("2026-04-27-009-create-friend-relationships-table.xml");

        Map<String, Object> tenth = rows.get(9);
        assertThat(tenth.get("id")).isEqualTo("2026-04-27-010-create-friend-requests-table");
        assertThat(tenth.get("author")).isEqualTo("worship-room");
        assertThat((String) tenth.get("filename"))
            .endsWith("2026-04-27-010-create-friend-requests-table.xml");

        Map<String, Object> eleventh = rows.get(10);
        assertThat(eleventh.get("id")).isEqualTo("2026-04-27-011-create-social-interactions-table");
        assertThat(eleventh.get("author")).isEqualTo("worship-room");
        assertThat((String) eleventh.get("filename"))
            .endsWith("2026-04-27-011-create-social-interactions-table.xml");

        Map<String, Object> twelfth = rows.get(11);
        assertThat(twelfth.get("id")).isEqualTo("2026-04-27-012-create-milestone-events-table");
        assertThat(twelfth.get("author")).isEqualTo("worship-room");
        assertThat((String) twelfth.get("filename"))
            .endsWith("2026-04-27-012-create-milestone-events-table.xml");

        Map<String, Object> thirteenth = rows.get(12);
        assertThat(thirteenth.get("id")).isEqualTo("2026-04-27-013-create-user-mutes-table");
        assertThat(thirteenth.get("author")).isEqualTo("worship-room");
        assertThat((String) thirteenth.get("filename"))
            .endsWith("2026-04-27-013-create-user-mutes-table.xml");

        Map<String, Object> fourteenth = rows.get(13);
        assertThat(fourteenth.get("id")).isEqualTo("2026-04-27-014-create-posts-table");
        assertThat(fourteenth.get("author")).isEqualTo("worship-room");
        assertThat((String) fourteenth.get("filename"))
            .endsWith("2026-04-27-014-create-posts-table.xml");

        Map<String, Object> fifteenth = rows.get(14);
        assertThat(fifteenth.get("id")).isEqualTo("2026-04-27-015-create-post-comments-table");
        assertThat(fifteenth.get("author")).isEqualTo("worship-room");
        assertThat((String) fifteenth.get("filename"))
            .endsWith("2026-04-27-015-create-post-comments-table.xml");

        Map<String, Object> sixteenth = rows.get(15);
        assertThat(sixteenth.get("id")).isEqualTo("2026-04-27-016-create-post-reactions-table");
        assertThat(sixteenth.get("author")).isEqualTo("worship-room");
        assertThat((String) sixteenth.get("filename"))
            .endsWith("2026-04-27-016-create-post-reactions-table.xml");

        Map<String, Object> seventeenth = rows.get(16);
        assertThat(seventeenth.get("id")).isEqualTo("2026-04-27-017-create-post-bookmarks-table");
        assertThat(seventeenth.get("author")).isEqualTo("worship-room");
        assertThat((String) seventeenth.get("filename"))
            .endsWith("2026-04-27-017-create-post-bookmarks-table.xml");

        Map<String, Object> eighteenth = rows.get(17);
        assertThat(eighteenth.get("id")).isEqualTo("2026-04-27-018-create-post-reports-table");
        assertThat(eighteenth.get("author")).isEqualTo("worship-room");
        assertThat((String) eighteenth.get("filename"))
            .endsWith("2026-04-27-018-create-post-reports-table.xml");

        Map<String, Object> nineteenth = rows.get(18);
        assertThat(nineteenth.get("id")).isEqualTo("2026-04-27-019-create-qotd-questions-table");
        assertThat(nineteenth.get("author")).isEqualTo("worship-room");
        assertThat((String) nineteenth.get("filename"))
            .endsWith("2026-04-27-019-create-qotd-questions-table.xml");

        Map<String, Object> twentieth = rows.get(19);
        assertThat(twentieth.get("id")).isEqualTo("2026-04-27-020-relax-post-reports-review-consistency");
        assertThat(twentieth.get("author")).isEqualTo("worship-room");
        assertThat((String) twentieth.get("filename"))
            .endsWith("2026-04-27-020-relax-post-reports-review-consistency.xml");
    }

    @Test
    void activityLogBackfillIdempotencyIndexExists() {
        // pg_indexes is the PostgreSQL system view that exposes index DDL including
        // partial-index WHERE clauses; information_schema.statistics omits them.
        // PostgreSQL re-renders the predicate with explicit type casts (e.g.
        // ((source_feature)::text = 'backfill'::text)); we assert the structural
        // pieces rather than the exact rendering to stay robust across versions.
        List<Map<String, Object>> rows = jdbcTemplate.queryForList(
            "SELECT indexname, indexdef FROM pg_indexes " +
            "WHERE schemaname = 'public' AND tablename = 'activity_log' " +
            "AND indexname = 'activity_log_backfill_idempotency_idx'"
        );
        assertThat(rows).hasSize(1);
        String indexDef = (String) rows.get(0).get("indexdef");
        assertThat(indexDef).contains("UNIQUE INDEX");
        assertThat(indexDef).contains("user_id");
        assertThat(indexDef).contains("activity_type");
        assertThat(indexDef).contains("occurred_at");
        assertThat(indexDef).contains("WHERE");
        assertThat(indexDef).contains("source_feature");
        assertThat(indexDef).contains("'backfill'");
    }

    @Test
    void timezoneColumnHasCorrectDefaultAndConstraints() {
        Map<String, Object> col = jdbcTemplate.queryForMap(
            "SELECT data_type, character_maximum_length, is_nullable, column_default " +
            "FROM information_schema.columns " +
            "WHERE table_schema = 'public' AND table_name = 'users' " +
            "AND column_name = 'timezone'"
        );

        assertThat(col.get("data_type")).isEqualTo("character varying");
        assertThat(col.get("character_maximum_length")).isEqualTo(50);
        assertThat(col.get("is_nullable")).isEqualTo("NO");
        assertThat(col.get("column_default").toString()).contains("UTC");
    }

    @Test
    void displayNamePreferenceCheckConstraintRejectsInvalidValues() {
        assertThatThrownBy(() ->
            jdbcTemplate.update(
                "INSERT INTO users (id, email, password_hash, first_name, last_name, " +
                "display_name_preference) VALUES (gen_random_uuid(), ?, ?, ?, ?, ?)",
                "invalid@example.com", "bcrypt-placeholder", "Test", "User", "invalid_value"
            )
        ).isInstanceOf(DataIntegrityViolationException.class)
         .hasMessageContaining("users_display_name_preference_check");
    }

    @Test
    void activityLogTableExistsWithExpectedColumns() {
        List<Map<String, Object>> columns = jdbcTemplate.queryForList(
            "SELECT column_name, data_type, is_nullable FROM information_schema.columns " +
            "WHERE table_schema = 'public' AND table_name = 'activity_log' " +
            "ORDER BY ordinal_position"
        );

        assertThat(columns).hasSize(7);
        assertThat(columns).extracting("column_name")
            .containsExactly(
                "id", "user_id", "activity_type", "source_feature",
                "occurred_at", "points_earned", "metadata"
            );

        Map<String, Object> idColumn = columns.stream()
            .filter(c -> "id".equals(c.get("column_name"))).findFirst().orElseThrow();
        assertThat(idColumn.get("data_type")).isEqualTo("uuid");
        assertThat(idColumn.get("is_nullable")).isEqualTo("NO");

        Map<String, Object> occurredAtColumn = columns.stream()
            .filter(c -> "occurred_at".equals(c.get("column_name"))).findFirst().orElseThrow();
        assertThat(occurredAtColumn.get("data_type")).isEqualTo("timestamp with time zone");
        assertThat(occurredAtColumn.get("is_nullable")).isEqualTo("NO");

        Map<String, Object> metadataColumn = columns.stream()
            .filter(c -> "metadata".equals(c.get("column_name"))).findFirst().orElseThrow();
        assertThat(metadataColumn.get("data_type")).isEqualTo("jsonb");
        assertThat(metadataColumn.get("is_nullable")).isEqualTo("YES");

        Map<String, Object> pointsColumn = columns.stream()
            .filter(c -> "points_earned".equals(c.get("column_name"))).findFirst().orElseThrow();
        assertThat(pointsColumn.get("data_type")).isEqualTo("integer");
        assertThat(pointsColumn.get("is_nullable")).isEqualTo("NO");
    }

    @Test
    void faithPointsTableExistsWithExpectedColumns() {
        List<Map<String, Object>> columns = jdbcTemplate.queryForList(
            "SELECT column_name, data_type, is_nullable FROM information_schema.columns " +
            "WHERE table_schema = 'public' AND table_name = 'faith_points' " +
            "ORDER BY ordinal_position"
        );

        assertThat(columns).hasSize(4);
        assertThat(columns).extracting("column_name")
            .containsExactly("user_id", "total_points", "current_level", "last_updated");

        Map<String, Object> userIdColumn = columns.stream()
            .filter(c -> "user_id".equals(c.get("column_name"))).findFirst().orElseThrow();
        assertThat(userIdColumn.get("data_type")).isEqualTo("uuid");
        assertThat(userIdColumn.get("is_nullable")).isEqualTo("NO");

        Map<String, Object> totalColumn = columns.stream()
            .filter(c -> "total_points".equals(c.get("column_name"))).findFirst().orElseThrow();
        assertThat(totalColumn.get("data_type")).isEqualTo("integer");
        assertThat(totalColumn.get("is_nullable")).isEqualTo("NO");

        Map<String, Object> lastUpdatedColumn = columns.stream()
            .filter(c -> "last_updated".equals(c.get("column_name"))).findFirst().orElseThrow();
        assertThat(lastUpdatedColumn.get("data_type")).isEqualTo("timestamp with time zone");
        assertThat(lastUpdatedColumn.get("is_nullable")).isEqualTo("NO");
    }

    @Test
    void streakStateTableExistsWithExpectedColumns() {
        List<Map<String, Object>> columns = jdbcTemplate.queryForList(
            "SELECT column_name, data_type, is_nullable FROM information_schema.columns " +
            "WHERE table_schema = 'public' AND table_name = 'streak_state' " +
            "ORDER BY ordinal_position"
        );

        assertThat(columns).hasSize(8);
        assertThat(columns).extracting("column_name")
            .containsExactly(
                "user_id", "current_streak", "longest_streak", "last_active_date",
                "grace_days_used", "grace_week_start", "grief_pause_until", "grief_pause_used_at"
            );

        Map<String, Object> lastActiveDateColumn = columns.stream()
            .filter(c -> "last_active_date".equals(c.get("column_name"))).findFirst().orElseThrow();
        assertThat(lastActiveDateColumn.get("data_type")).isEqualTo("date");
        assertThat(lastActiveDateColumn.get("is_nullable")).isEqualTo("YES");

        Map<String, Object> griefPauseUntilColumn = columns.stream()
            .filter(c -> "grief_pause_until".equals(c.get("column_name"))).findFirst().orElseThrow();
        assertThat(griefPauseUntilColumn.get("data_type")).isEqualTo("date");
        assertThat(griefPauseUntilColumn.get("is_nullable")).isEqualTo("YES");

        Map<String, Object> griefPauseUsedAtColumn = columns.stream()
            .filter(c -> "grief_pause_used_at".equals(c.get("column_name"))).findFirst().orElseThrow();
        assertThat(griefPauseUsedAtColumn.get("data_type")).isEqualTo("timestamp with time zone");
        assertThat(griefPauseUsedAtColumn.get("is_nullable")).isEqualTo("YES");
    }

    @Test
    void userBadgesTableExistsWithExpectedColumnsAndCompositePK() {
        List<Map<String, Object>> columns = jdbcTemplate.queryForList(
            "SELECT column_name, data_type, is_nullable FROM information_schema.columns " +
            "WHERE table_schema = 'public' AND table_name = 'user_badges' " +
            "ORDER BY ordinal_position"
        );

        assertThat(columns).hasSize(4);
        assertThat(columns).extracting("column_name")
            .containsExactly("user_id", "badge_id", "earned_at", "display_count");

        Map<String, Object> badgeIdColumn = columns.stream()
            .filter(c -> "badge_id".equals(c.get("column_name"))).findFirst().orElseThrow();
        assertThat(badgeIdColumn.get("data_type")).isEqualTo("character varying");
        assertThat(badgeIdColumn.get("is_nullable")).isEqualTo("NO");

        Map<String, Object> earnedAtColumn = columns.stream()
            .filter(c -> "earned_at".equals(c.get("column_name"))).findFirst().orElseThrow();
        assertThat(earnedAtColumn.get("data_type")).isEqualTo("timestamp with time zone");
        assertThat(earnedAtColumn.get("is_nullable")).isEqualTo("NO");

        Map<String, Object> displayCountColumn = columns.stream()
            .filter(c -> "display_count".equals(c.get("column_name"))).findFirst().orElseThrow();
        assertThat(displayCountColumn.get("data_type")).isEqualTo("integer");
        assertThat(displayCountColumn.get("is_nullable")).isEqualTo("NO");

        List<String> pkColumns = jdbcTemplate.queryForList(
            "SELECT kcu.column_name " +
            "FROM information_schema.table_constraints tc " +
            "JOIN information_schema.key_column_usage kcu " +
            "  ON tc.constraint_name = kcu.constraint_name " +
            "WHERE tc.table_schema = 'public' " +
            "  AND tc.table_name = ? " +
            "  AND tc.constraint_type = 'PRIMARY KEY' " +
            "ORDER BY kcu.ordinal_position",
            String.class, "user_badges"
        );
        assertThat(pkColumns).containsExactly("user_id", "badge_id");
    }

    @Test
    void activityCountsTableExistsWithExpectedColumnsAndCompositePK() {
        List<Map<String, Object>> columns = jdbcTemplate.queryForList(
            "SELECT column_name, data_type, is_nullable FROM information_schema.columns " +
            "WHERE table_schema = 'public' AND table_name = 'activity_counts' " +
            "ORDER BY ordinal_position"
        );

        assertThat(columns).hasSize(4);
        assertThat(columns).extracting("column_name")
            .containsExactly("user_id", "count_type", "count_value", "last_updated");

        Map<String, Object> countTypeColumn = columns.stream()
            .filter(c -> "count_type".equals(c.get("column_name"))).findFirst().orElseThrow();
        assertThat(countTypeColumn.get("data_type")).isEqualTo("character varying");
        assertThat(countTypeColumn.get("is_nullable")).isEqualTo("NO");

        Map<String, Object> countValueColumn = columns.stream()
            .filter(c -> "count_value".equals(c.get("column_name"))).findFirst().orElseThrow();
        assertThat(countValueColumn.get("data_type")).isEqualTo("integer");
        assertThat(countValueColumn.get("is_nullable")).isEqualTo("NO");

        List<String> pkColumns = jdbcTemplate.queryForList(
            "SELECT kcu.column_name " +
            "FROM information_schema.table_constraints tc " +
            "JOIN information_schema.key_column_usage kcu " +
            "  ON tc.constraint_name = kcu.constraint_name " +
            "WHERE tc.table_schema = 'public' " +
            "  AND tc.table_name = ? " +
            "  AND tc.constraint_type = 'PRIMARY KEY' " +
            "ORDER BY kcu.ordinal_position",
            String.class, "activity_counts"
        );
        assertThat(pkColumns).containsExactly("user_id", "count_type");
    }

    @Test
    void friendRelationshipsTableExistsWithExpectedColumnsAndCompositePK() {
        List<Map<String, Object>> columns = jdbcTemplate.queryForList(
            "SELECT column_name, data_type, is_nullable FROM information_schema.columns " +
            "WHERE table_schema = 'public' AND table_name = 'friend_relationships' " +
            "ORDER BY ordinal_position"
        );

        assertThat(columns).hasSize(4);
        assertThat(columns).extracting("column_name")
            .containsExactly("user_id", "friend_user_id", "status", "created_at");

        Map<String, Object> userIdColumn = columns.stream()
            .filter(c -> "user_id".equals(c.get("column_name"))).findFirst().orElseThrow();
        assertThat(userIdColumn.get("data_type")).isEqualTo("uuid");
        assertThat(userIdColumn.get("is_nullable")).isEqualTo("NO");

        Map<String, Object> statusColumn = columns.stream()
            .filter(c -> "status".equals(c.get("column_name"))).findFirst().orElseThrow();
        assertThat(statusColumn.get("data_type")).isEqualTo("character varying");
        assertThat(statusColumn.get("is_nullable")).isEqualTo("NO");

        Map<String, Object> createdAtColumn = columns.stream()
            .filter(c -> "created_at".equals(c.get("column_name"))).findFirst().orElseThrow();
        assertThat(createdAtColumn.get("data_type")).isEqualTo("timestamp with time zone");

        List<String> pkColumns = jdbcTemplate.queryForList(
            "SELECT kcu.column_name " +
            "FROM information_schema.table_constraints tc " +
            "JOIN information_schema.key_column_usage kcu " +
            "  ON tc.constraint_name = kcu.constraint_name " +
            "WHERE tc.table_schema = 'public' " +
            "  AND tc.table_name = ? " +
            "  AND tc.constraint_type = 'PRIMARY KEY' " +
            "ORDER BY kcu.ordinal_position",
            String.class, "friend_relationships"
        );
        assertThat(pkColumns).containsExactly("user_id", "friend_user_id");
    }

    @Test
    void friendRequestsTableExistsWithExpectedColumnsAndUnique() {
        List<Map<String, Object>> columns = jdbcTemplate.queryForList(
            "SELECT column_name, data_type, character_maximum_length, is_nullable " +
            "FROM information_schema.columns " +
            "WHERE table_schema = 'public' AND table_name = 'friend_requests' " +
            "ORDER BY ordinal_position"
        );

        assertThat(columns).hasSize(7);
        assertThat(columns).extracting("column_name")
            .containsExactly(
                "id", "from_user_id", "to_user_id", "status", "message",
                "created_at", "responded_at"
            );

        Map<String, Object> idColumn = columns.stream()
            .filter(c -> "id".equals(c.get("column_name"))).findFirst().orElseThrow();
        assertThat(idColumn.get("data_type")).isEqualTo("uuid");
        assertThat(idColumn.get("is_nullable")).isEqualTo("NO");

        Map<String, Object> messageColumn = columns.stream()
            .filter(c -> "message".equals(c.get("column_name"))).findFirst().orElseThrow();
        assertThat(messageColumn.get("data_type")).isEqualTo("character varying");
        assertThat(messageColumn.get("character_maximum_length")).isEqualTo(280);
        assertThat(messageColumn.get("is_nullable")).isEqualTo("YES");

        Map<String, Object> respondedAtColumn = columns.stream()
            .filter(c -> "responded_at".equals(c.get("column_name"))).findFirst().orElseThrow();
        assertThat(respondedAtColumn.get("data_type")).isEqualTo("timestamp with time zone");
        assertThat(respondedAtColumn.get("is_nullable")).isEqualTo("YES");

        List<String> uniqueColumns = jdbcTemplate.queryForList(
            "SELECT kcu.column_name " +
            "FROM information_schema.table_constraints tc " +
            "JOIN information_schema.key_column_usage kcu " +
            "  ON tc.constraint_name = kcu.constraint_name " +
            "WHERE tc.table_schema = 'public' " +
            "  AND tc.table_name = ? " +
            "  AND tc.constraint_name = ? " +
            "ORDER BY kcu.ordinal_position",
            String.class, "friend_requests", "friend_requests_unique_sender_recipient"
        );
        assertThat(uniqueColumns).containsExactly("from_user_id", "to_user_id");
    }

    @Test
    void socialInteractionsTableExistsWithExpectedColumns() {
        List<Map<String, Object>> columns = jdbcTemplate.queryForList(
            "SELECT column_name, data_type, is_nullable FROM information_schema.columns " +
            "WHERE table_schema = 'public' AND table_name = 'social_interactions' " +
            "ORDER BY ordinal_position"
        );

        assertThat(columns).hasSize(6);
        assertThat(columns).extracting("column_name")
            .containsExactly(
                "id", "from_user_id", "to_user_id", "interaction_type",
                "payload", "created_at"
            );

        Map<String, Object> idColumn = columns.stream()
            .filter(c -> "id".equals(c.get("column_name"))).findFirst().orElseThrow();
        assertThat(idColumn.get("data_type")).isEqualTo("uuid");

        Map<String, Object> payloadColumn = columns.stream()
            .filter(c -> "payload".equals(c.get("column_name"))).findFirst().orElseThrow();
        assertThat(payloadColumn.get("data_type")).isEqualTo("jsonb");
        assertThat(payloadColumn.get("is_nullable")).isEqualTo("YES");

        Map<String, Object> createdAtColumn = columns.stream()
            .filter(c -> "created_at".equals(c.get("column_name"))).findFirst().orElseThrow();
        assertThat(createdAtColumn.get("data_type")).isEqualTo("timestamp with time zone");
        assertThat(createdAtColumn.get("is_nullable")).isEqualTo("NO");
    }

    @Test
    void milestoneEventsTableExistsWithExpectedColumns() {
        List<Map<String, Object>> columns = jdbcTemplate.queryForList(
            "SELECT column_name, data_type, is_nullable FROM information_schema.columns " +
            "WHERE table_schema = 'public' AND table_name = 'milestone_events' " +
            "ORDER BY ordinal_position"
        );

        assertThat(columns).hasSize(5);
        assertThat(columns).extracting("column_name")
            .containsExactly("id", "user_id", "event_type", "event_metadata", "occurred_at");

        Map<String, Object> idColumn = columns.stream()
            .filter(c -> "id".equals(c.get("column_name"))).findFirst().orElseThrow();
        assertThat(idColumn.get("data_type")).isEqualTo("uuid");

        Map<String, Object> eventMetadataColumn = columns.stream()
            .filter(c -> "event_metadata".equals(c.get("column_name"))).findFirst().orElseThrow();
        assertThat(eventMetadataColumn.get("data_type")).isEqualTo("jsonb");
        assertThat(eventMetadataColumn.get("is_nullable")).isEqualTo("YES");

        Map<String, Object> occurredAtColumn = columns.stream()
            .filter(c -> "occurred_at".equals(c.get("column_name"))).findFirst().orElseThrow();
        assertThat(occurredAtColumn.get("data_type")).isEqualTo("timestamp with time zone");
        assertThat(occurredAtColumn.get("is_nullable")).isEqualTo("NO");
    }

    @Test
    void postsTableExistsWithExpectedColumnsAndIndexes() {
        List<Map<String, Object>> columns = jdbcTemplate.queryForList(
            "SELECT column_name, data_type, is_nullable FROM information_schema.columns " +
            "WHERE table_schema = 'public' AND table_name = 'posts' " +
            "ORDER BY ordinal_position"
        );

        assertThat(columns).hasSize(30);
        assertThat(columns).extracting("column_name")
            .containsExactly(
                "id", "user_id", "post_type", "content", "category", "is_anonymous",
                "challenge_id", "qotd_id", "scripture_reference", "scripture_text",
                "visibility", "is_answered", "answered_text", "answered_at",
                "moderation_status", "crisis_flag", "is_deleted", "deleted_at",
                "praying_count", "candle_count", "comment_count", "bookmark_count",
                "report_count", "created_at", "updated_at", "last_activity_at",
                "question_resolved_comment_id",
                "image_url", "image_alt_text", "help_tags"
            );

        Map<String, Object> idColumn = columns.stream()
            .filter(c -> "id".equals(c.get("column_name"))).findFirst().orElseThrow();
        assertThat(idColumn.get("data_type")).isEqualTo("uuid");
        assertThat(idColumn.get("is_nullable")).isEqualTo("NO");

        Map<String, Object> userIdColumn = columns.stream()
            .filter(c -> "user_id".equals(c.get("column_name"))).findFirst().orElseThrow();
        assertThat(userIdColumn.get("data_type")).isEqualTo("uuid");
        assertThat(userIdColumn.get("is_nullable")).isEqualTo("NO");

        Map<String, Object> contentColumn = columns.stream()
            .filter(c -> "content".equals(c.get("column_name"))).findFirst().orElseThrow();
        assertThat(contentColumn.get("data_type")).isEqualTo("text");
        assertThat(contentColumn.get("is_nullable")).isEqualTo("NO");

        Map<String, Object> categoryColumn = columns.stream()
            .filter(c -> "category".equals(c.get("column_name"))).findFirst().orElseThrow();
        assertThat(categoryColumn.get("data_type")).isEqualTo("character varying");
        assertThat(categoryColumn.get("is_nullable")).isEqualTo("YES");

        Map<String, Object> isAnonColumn = columns.stream()
            .filter(c -> "is_anonymous".equals(c.get("column_name"))).findFirst().orElseThrow();
        assertThat(isAnonColumn.get("data_type")).isEqualTo("boolean");
        assertThat(isAnonColumn.get("is_nullable")).isEqualTo("NO");

        Map<String, Object> prayingCountColumn = columns.stream()
            .filter(c -> "praying_count".equals(c.get("column_name"))).findFirst().orElseThrow();
        assertThat(prayingCountColumn.get("data_type")).isEqualTo("integer");
        assertThat(prayingCountColumn.get("is_nullable")).isEqualTo("NO");

        Map<String, Object> lastActivityAtColumn = columns.stream()
            .filter(c -> "last_activity_at".equals(c.get("column_name"))).findFirst().orElseThrow();
        assertThat(lastActivityAtColumn.get("data_type")).isEqualTo("timestamp with time zone");
        assertThat(lastActivityAtColumn.get("is_nullable")).isEqualTo("NO");

        List<Map<String, Object>> indexes = jdbcTemplate.queryForList(
            "SELECT indexname, indexdef FROM pg_indexes " +
            "WHERE schemaname = 'public' AND tablename = 'posts'"
        );
        assertThat(indexes).extracting("indexname")
            .contains(
                "idx_posts_user_id_created_at",
                "idx_posts_visibility_moderation_created",
                "idx_posts_category_created",
                "idx_posts_post_type_created",
                "idx_posts_last_activity",
                "idx_posts_qotd_id",
                "idx_posts_challenge_id",
                "idx_posts_crisis_flag",
                "idx_posts_is_answered_created"
            );

        // Spot-check predicates on two partial indexes — the WHERE clause is
        // re-rendered by Postgres with explicit type casts, so assert structural
        // pieces rather than the exact rendering.
        String crisisFlagDef = (String) indexes.stream()
            .filter(r -> "idx_posts_crisis_flag".equals(r.get("indexname")))
            .findFirst().orElseThrow().get("indexdef");
        assertThat(crisisFlagDef).contains("WHERE");
        assertThat(crisisFlagDef).contains("crisis_flag");
        assertThat(crisisFlagDef).contains("is_deleted");

        String qotdIdDef = (String) indexes.stream()
            .filter(r -> "idx_posts_qotd_id".equals(r.get("indexname")))
            .findFirst().orElseThrow().get("indexdef");
        assertThat(qotdIdDef).contains("WHERE");
        assertThat(qotdIdDef).contains("qotd_id IS NOT NULL");
    }

    @Test
    void postCommentsTableExistsWithExpectedColumns() {
        List<Map<String, Object>> columns = jdbcTemplate.queryForList(
            "SELECT column_name, data_type, is_nullable FROM information_schema.columns " +
            "WHERE table_schema = 'public' AND table_name = 'post_comments' " +
            "ORDER BY ordinal_position"
        );

        assertThat(columns).hasSize(12);
        assertThat(columns).extracting("column_name")
            .containsExactly(
                "id", "post_id", "user_id", "parent_comment_id", "content",
                "is_helpful", "is_deleted", "deleted_at", "moderation_status",
                "crisis_flag", "created_at", "updated_at"
            );

        Map<String, Object> idColumn = columns.stream()
            .filter(c -> "id".equals(c.get("column_name"))).findFirst().orElseThrow();
        assertThat(idColumn.get("data_type")).isEqualTo("uuid");
        assertThat(idColumn.get("is_nullable")).isEqualTo("NO");

        Map<String, Object> parentColumn = columns.stream()
            .filter(c -> "parent_comment_id".equals(c.get("column_name"))).findFirst().orElseThrow();
        assertThat(parentColumn.get("data_type")).isEqualTo("uuid");
        assertThat(parentColumn.get("is_nullable")).isEqualTo("YES");

        Map<String, Object> isHelpfulColumn = columns.stream()
            .filter(c -> "is_helpful".equals(c.get("column_name"))).findFirst().orElseThrow();
        assertThat(isHelpfulColumn.get("data_type")).isEqualTo("boolean");
        assertThat(isHelpfulColumn.get("is_nullable")).isEqualTo("NO");

        Map<String, Object> crisisFlagColumn = columns.stream()
            .filter(c -> "crisis_flag".equals(c.get("column_name"))).findFirst().orElseThrow();
        assertThat(crisisFlagColumn.get("data_type")).isEqualTo("boolean");
        assertThat(crisisFlagColumn.get("is_nullable")).isEqualTo("NO");

        Map<String, Object> createdAtColumn = columns.stream()
            .filter(c -> "created_at".equals(c.get("column_name"))).findFirst().orElseThrow();
        assertThat(createdAtColumn.get("data_type")).isEqualTo("timestamp with time zone");
        assertThat(createdAtColumn.get("is_nullable")).isEqualTo("NO");

        List<String> indexNames = jdbcTemplate.queryForList(
            "SELECT indexname FROM pg_indexes " +
            "WHERE schemaname = 'public' AND tablename = 'post_comments'",
            String.class
        );
        assertThat(indexNames).contains(
            "idx_post_comments_post_id_created",
            "idx_post_comments_user_id_created",
            "idx_post_comments_parent"
        );
    }

    @Test
    void postReactionsTableExistsWithExpectedColumnsAndCompositePK() {
        List<Map<String, Object>> columns = jdbcTemplate.queryForList(
            "SELECT column_name, data_type, is_nullable FROM information_schema.columns " +
            "WHERE table_schema = 'public' AND table_name = 'post_reactions' " +
            "ORDER BY ordinal_position"
        );

        assertThat(columns).hasSize(4);
        assertThat(columns).extracting("column_name")
            .containsExactly("post_id", "user_id", "reaction_type", "created_at");

        List<String> pkColumns = jdbcTemplate.queryForList(
            "SELECT kcu.column_name " +
            "FROM information_schema.table_constraints tc " +
            "JOIN information_schema.key_column_usage kcu " +
            "  ON tc.constraint_name = kcu.constraint_name " +
            "WHERE tc.table_schema = 'public' " +
            "  AND tc.table_name = ? " +
            "  AND tc.constraint_type = 'PRIMARY KEY' " +
            "ORDER BY kcu.ordinal_position",
            String.class, "post_reactions"
        );
        assertThat(pkColumns).containsExactly("post_id", "user_id", "reaction_type");

        List<String> indexNames = jdbcTemplate.queryForList(
            "SELECT indexname FROM pg_indexes " +
            "WHERE schemaname = 'public' AND tablename = 'post_reactions'",
            String.class
        );
        assertThat(indexNames).contains(
            "idx_post_reactions_post_type",
            "idx_post_reactions_user_created"
        );
    }

    @Test
    void postBookmarksTableExistsWithExpectedColumnsAndCompositePK() {
        List<Map<String, Object>> columns = jdbcTemplate.queryForList(
            "SELECT column_name, data_type, is_nullable FROM information_schema.columns " +
            "WHERE table_schema = 'public' AND table_name = 'post_bookmarks' " +
            "ORDER BY ordinal_position"
        );

        assertThat(columns).hasSize(3);
        assertThat(columns).extracting("column_name")
            .containsExactly("post_id", "user_id", "created_at");

        List<String> pkColumns = jdbcTemplate.queryForList(
            "SELECT kcu.column_name " +
            "FROM information_schema.table_constraints tc " +
            "JOIN information_schema.key_column_usage kcu " +
            "  ON tc.constraint_name = kcu.constraint_name " +
            "WHERE tc.table_schema = 'public' " +
            "  AND tc.table_name = ? " +
            "  AND tc.constraint_type = 'PRIMARY KEY' " +
            "ORDER BY kcu.ordinal_position",
            String.class, "post_bookmarks"
        );
        assertThat(pkColumns).containsExactly("post_id", "user_id");

        List<String> indexNames = jdbcTemplate.queryForList(
            "SELECT indexname FROM pg_indexes " +
            "WHERE schemaname = 'public' AND tablename = 'post_bookmarks'",
            String.class
        );
        assertThat(indexNames).contains("idx_post_bookmarks_user_created");
    }

    @Test
    void postReportsTableExistsWithExpectedColumns() {
        List<Map<String, Object>> columns = jdbcTemplate.queryForList(
            "SELECT column_name, data_type, is_nullable FROM information_schema.columns " +
            "WHERE table_schema = 'public' AND table_name = 'post_reports' " +
            "ORDER BY ordinal_position"
        );

        assertThat(columns).hasSize(11);
        assertThat(columns).extracting("column_name")
            .containsExactly(
                "id", "post_id", "comment_id", "reporter_id", "reason",
                "details", "status", "reviewer_id", "reviewed_at",
                "action_taken", "created_at"
            );

        Map<String, Object> postIdColumn = columns.stream()
            .filter(c -> "post_id".equals(c.get("column_name"))).findFirst().orElseThrow();
        assertThat(postIdColumn.get("data_type")).isEqualTo("uuid");
        assertThat(postIdColumn.get("is_nullable")).isEqualTo("YES");

        Map<String, Object> commentIdColumn = columns.stream()
            .filter(c -> "comment_id".equals(c.get("column_name"))).findFirst().orElseThrow();
        assertThat(commentIdColumn.get("data_type")).isEqualTo("uuid");
        assertThat(commentIdColumn.get("is_nullable")).isEqualTo("YES");

        Map<String, Object> reporterIdColumn = columns.stream()
            .filter(c -> "reporter_id".equals(c.get("column_name"))).findFirst().orElseThrow();
        assertThat(reporterIdColumn.get("data_type")).isEqualTo("uuid");
        assertThat(reporterIdColumn.get("is_nullable")).isEqualTo("NO");

        Map<String, Object> reasonColumn = columns.stream()
            .filter(c -> "reason".equals(c.get("column_name"))).findFirst().orElseThrow();
        assertThat(reasonColumn.get("data_type")).isEqualTo("character varying");
        assertThat(reasonColumn.get("is_nullable")).isEqualTo("NO");

        Map<String, Object> detailsColumn = columns.stream()
            .filter(c -> "details".equals(c.get("column_name"))).findFirst().orElseThrow();
        assertThat(detailsColumn.get("data_type")).isEqualTo("text");
        assertThat(detailsColumn.get("is_nullable")).isEqualTo("YES");

        Map<String, Object> reviewerIdColumn = columns.stream()
            .filter(c -> "reviewer_id".equals(c.get("column_name"))).findFirst().orElseThrow();
        assertThat(reviewerIdColumn.get("data_type")).isEqualTo("uuid");
        assertThat(reviewerIdColumn.get("is_nullable")).isEqualTo("YES");

        Map<String, Object> actionTakenColumn = columns.stream()
            .filter(c -> "action_taken".equals(c.get("column_name"))).findFirst().orElseThrow();
        assertThat(actionTakenColumn.get("data_type")).isEqualTo("character varying");
        assertThat(actionTakenColumn.get("is_nullable")).isEqualTo("YES");

        List<String> indexNames = jdbcTemplate.queryForList(
            "SELECT indexname FROM pg_indexes " +
            "WHERE schemaname = 'public' AND tablename = 'post_reports'",
            String.class
        );
        assertThat(indexNames).contains(
            "idx_post_reports_status_created",
            "idx_post_reports_post_id",
            "idx_post_reports_comment_id",
            "idx_post_reports_reporter_id_created"
        );
    }

    @Test
    void qotdQuestionsTableExistsWithExpectedColumns() {
        List<Map<String, Object>> columns = jdbcTemplate.queryForList(
            "SELECT column_name, data_type, character_maximum_length, is_nullable " +
            "FROM information_schema.columns " +
            "WHERE table_schema = 'public' AND table_name = 'qotd_questions' " +
            "ORDER BY ordinal_position"
        );

        assertThat(columns).hasSize(7);
        assertThat(columns).extracting("column_name")
            .containsExactly("id", "text", "theme", "hint", "display_order", "is_active", "created_at");

        Map<String, Object> idColumn = columns.stream()
            .filter(c -> "id".equals(c.get("column_name"))).findFirst().orElseThrow();
        assertThat(idColumn.get("data_type")).isEqualTo("character varying");
        assertThat(idColumn.get("character_maximum_length")).isEqualTo(50);
        assertThat(idColumn.get("is_nullable")).isEqualTo("NO");

        Map<String, Object> displayOrderColumn = columns.stream()
            .filter(c -> "display_order".equals(c.get("column_name"))).findFirst().orElseThrow();
        assertThat(displayOrderColumn.get("data_type")).isEqualTo("integer");
        assertThat(displayOrderColumn.get("is_nullable")).isEqualTo("NO");

        Map<String, Object> isActiveColumn = columns.stream()
            .filter(c -> "is_active".equals(c.get("column_name"))).findFirst().orElseThrow();
        assertThat(isActiveColumn.get("data_type")).isEqualTo("boolean");
        assertThat(isActiveColumn.get("is_nullable")).isEqualTo("NO");

        List<String> pkColumns = jdbcTemplate.queryForList(
            "SELECT kcu.column_name " +
            "FROM information_schema.table_constraints tc " +
            "JOIN information_schema.key_column_usage kcu " +
            "  ON tc.constraint_name = kcu.constraint_name " +
            "WHERE tc.table_schema = 'public' " +
            "  AND tc.table_name = ? " +
            "  AND tc.constraint_type = 'PRIMARY KEY' " +
            "ORDER BY kcu.ordinal_position",
            String.class, "qotd_questions"
        );
        assertThat(pkColumns).containsExactly("id");

        Integer uniqueCount = jdbcTemplate.queryForObject(
            "SELECT COUNT(*) FROM information_schema.table_constraints " +
            "WHERE table_schema = 'public' AND table_name = 'qotd_questions' " +
            "AND constraint_name = 'qotd_questions_display_order_unique' " +
            "AND constraint_type = 'UNIQUE'",
            Integer.class
        );
        assertThat(uniqueCount).isEqualTo(1);

        List<Map<String, Object>> indexes = jdbcTemplate.queryForList(
            "SELECT indexname, indexdef FROM pg_indexes " +
            "WHERE schemaname = 'public' AND tablename = 'qotd_questions' " +
            "AND indexname = 'idx_qotd_questions_active_order'"
        );
        assertThat(indexes).hasSize(1);
        String indexDef = (String) indexes.get(0).get("indexdef");
        assertThat(indexDef).contains("WHERE");
        assertThat(indexDef).contains("is_active");
    }

    @ParameterizedTest(name = "phase 2.5 CHECK {0} rejects invalid value")
    @CsvSource({
        "friend_relationships_status_check",
        "friend_relationships_no_self_reference",
        "friend_requests_status_check",
        "friend_requests_no_self_reference",
        "social_interactions_type_check",
        "milestone_events_type_check",
        "user_mutes_no_self_mute"
    })
    void phase25CheckConstraintRejectsInvalidValue(String constraintName) {
        UUID userA = insertTestUser(constraintName + "-a");
        UUID userB = insertTestUser(constraintName + "-b");

        assertThatThrownBy(() -> {
            switch (constraintName) {
                case "friend_relationships_status_check" ->
                    jdbcTemplate.update(
                        "INSERT INTO friend_relationships (user_id, friend_user_id, status) " +
                        "VALUES (?, ?, ?)",
                        userA, userB, "accepted"); // 'accepted' belongs to friend_requests, not _relationships
                case "friend_relationships_no_self_reference" ->
                    jdbcTemplate.update(
                        "INSERT INTO friend_relationships (user_id, friend_user_id, status) " +
                        "VALUES (?, ?, ?)",
                        userA, userA, "active");
                case "friend_requests_status_check" ->
                    jdbcTemplate.update(
                        "INSERT INTO friend_requests (from_user_id, to_user_id, status) " +
                        "VALUES (?, ?, ?)",
                        userA, userB, "unknown_status");
                case "friend_requests_no_self_reference" ->
                    jdbcTemplate.update(
                        "INSERT INTO friend_requests (from_user_id, to_user_id, status) " +
                        "VALUES (?, ?, ?)",
                        userA, userA, "pending");
                case "social_interactions_type_check" ->
                    jdbcTemplate.update(
                        "INSERT INTO social_interactions (from_user_id, to_user_id, interaction_type) " +
                        "VALUES (?, ?, ?)",
                        userA, userB, "spam");
                case "milestone_events_type_check" ->
                    jdbcTemplate.update(
                        "INSERT INTO milestone_events (user_id, event_type) VALUES (?, ?)",
                        userA, "unknown_event");
                case "user_mutes_no_self_mute" ->
                    // Spec 2.5.7 — DB-level defense-in-depth for self-mute. Service also
                    // throws SelfActionException; this asserts the CHECK constraint catches
                    // any code path that bypasses the service (raw SQL, future endpoints).
                    jdbcTemplate.update(
                        "INSERT INTO user_mutes (muter_id, muted_id) VALUES (?, ?)",
                        userA, userA);
                default ->
                    throw new IllegalStateException("Unhandled constraint: " + constraintName);
            }
        }).isInstanceOf(DataIntegrityViolationException.class)
          .hasMessageContaining(constraintName);
    }

    @Test
    void friendRequestsUniqueBlocksRequestAfterDecline() {
        UUID sender = insertTestUser("unique-decline-sender");
        UUID recipient = insertTestUser("unique-decline-recipient");

        // First request goes through.
        jdbcTemplate.update(
            "INSERT INTO friend_requests (from_user_id, to_user_id, status) VALUES (?, ?, ?)",
            sender, recipient, "pending"
        );

        // Recipient declines.
        jdbcTemplate.update(
            "UPDATE friend_requests SET status = ?, responded_at = NOW() " +
            "WHERE from_user_id = ? AND to_user_id = ?",
            "declined", sender, recipient
        );

        // Sender attempts a fresh request — must fail with UNIQUE violation.
        assertThatThrownBy(() ->
            jdbcTemplate.update(
                "INSERT INTO friend_requests (from_user_id, to_user_id, status) VALUES (?, ?, ?)",
                sender, recipient, "pending"
            )
        ).isInstanceOf(DataIntegrityViolationException.class)
         .hasMessageContaining("friend_requests_unique_sender_recipient");
    }

    @Test
    void friendRequestsUniqueBlocksRequestAfterCancel() {
        UUID sender = insertTestUser("unique-cancel-sender");
        UUID recipient = insertTestUser("unique-cancel-recipient");

        jdbcTemplate.update(
            "INSERT INTO friend_requests (from_user_id, to_user_id, status) VALUES (?, ?, ?)",
            sender, recipient, "pending"
        );

        jdbcTemplate.update(
            "UPDATE friend_requests SET status = ?, responded_at = NOW() " +
            "WHERE from_user_id = ? AND to_user_id = ?",
            "cancelled", sender, recipient
        );

        assertThatThrownBy(() ->
            jdbcTemplate.update(
                "INSERT INTO friend_requests (from_user_id, to_user_id, status) VALUES (?, ?, ?)",
                sender, recipient, "pending"
            )
        ).isInstanceOf(DataIntegrityViolationException.class)
         .hasMessageContaining("friend_requests_unique_sender_recipient");
    }

    @ParameterizedTest(name = "deleting user cascades rows from {0}")
    @CsvSource({
        "friend_relationships",
        "friend_requests",
        "social_interactions",
        "milestone_events"
    })
    void phase25TableCascadesOnUserDelete(String tableName) {
        UUID userA = insertTestUser("cascade-" + tableName + "-a");
        UUID userB = insertTestUser("cascade-" + tableName + "-b");

        switch (tableName) {
            case "friend_relationships" ->
                jdbcTemplate.update(
                    "INSERT INTO friend_relationships (user_id, friend_user_id, status) " +
                    "VALUES (?, ?, ?)",
                    userA, userB, "active");
            case "friend_requests" ->
                jdbcTemplate.update(
                    "INSERT INTO friend_requests (from_user_id, to_user_id, status) " +
                    "VALUES (?, ?, ?)",
                    userA, userB, "pending");
            case "social_interactions" ->
                jdbcTemplate.update(
                    "INSERT INTO social_interactions (from_user_id, to_user_id, interaction_type) " +
                    "VALUES (?, ?, ?)",
                    userA, userB, "encouragement");
            case "milestone_events" ->
                jdbcTemplate.update(
                    "INSERT INTO milestone_events (user_id, event_type) VALUES (?, ?)",
                    userA, "level_up");
            default ->
                throw new IllegalStateException("Unhandled table: " + tableName);
        }

        // Sanity: row exists before delete. Tables that own the user via a "from_user_id"
        // column (friend_requests, social_interactions) are queried by that column;
        // friend_relationships and milestone_events use the plain "user_id" column.
        String userColumn = switch (tableName) {
            case "friend_relationships", "milestone_events" -> "user_id";
            case "friend_requests", "social_interactions" -> "from_user_id";
            default -> throw new IllegalStateException("Unhandled table: " + tableName);
        };
        Integer beforeCount = jdbcTemplate.queryForObject(
            "SELECT COUNT(*) FROM " + tableName + " WHERE " + userColumn + " = ?",
            Integer.class, userA
        );
        assertThat(beforeCount).isEqualTo(1);

        // Delete userA — cascade should remove all rows referencing userA.
        jdbcTemplate.update("DELETE FROM users WHERE id = ?", userA);

        Integer afterCount = jdbcTemplate.queryForObject(
            "SELECT COUNT(*) FROM " + tableName + " WHERE " + userColumn + " = ?",
            Integer.class, userA
        );
        assertThat(afterCount).isEqualTo(0);
    }

    @ParameterizedTest(name = "phase 3 CHECK {0} rejects invalid value")
    @CsvSource({
        "posts_post_type_check",
        "posts_category_check",
        "posts_visibility_check",
        "posts_moderation_status_check",
        "posts_soft_delete_consistency",
        "posts_answered_consistency",
        "post_comments_moderation_status_check",
        "post_comments_soft_delete_consistency",
        "post_reactions_reaction_type_check",
        "post_reports_target_xor_check_both_set",
        "post_reports_target_xor_check_neither_set",
        "post_reports_status_check",
        "post_reports_review_consistency",
        "qotd_questions_theme_check"
    })
    void phase3CheckConstraintRejectsInvalidValue(String caseName) {
        // The XOR check is tested twice (both-set + neither-set) but both branches
        // assert the same constraint name `post_reports_target_xor_check`.
        // The status_check case is special: any invalid status simultaneously
        // violates both `post_reports_status_check` and `post_reports_review_consistency`
        // (the latter requires status to be in the same enum), so Postgres reports
        // whichever it evaluates first — accept either name.
        String constraintName = caseName.startsWith("post_reports_target_xor_check")
            ? "post_reports_target_xor_check"
            : caseName;
        String[] acceptableConstraintNames = caseName.equals("post_reports_status_check")
            ? new String[]{"post_reports_status_check", "post_reports_review_consistency"}
            : new String[]{constraintName};

        UUID userA = insertTestUser(caseName + "-a");

        assertThatThrownBy(() -> {
            switch (caseName) {
                case "posts_post_type_check" ->
                    jdbcTemplate.update(
                        "INSERT INTO posts (user_id, post_type, content) VALUES (?, ?, ?)",
                        userA, "invalid_type", "test");
                case "posts_category_check" ->
                    jdbcTemplate.update(
                        "INSERT INTO posts (user_id, post_type, content, category) VALUES (?, ?, ?, ?)",
                        userA, "prayer_request", "test", "invalid_category");
                case "posts_visibility_check" ->
                    jdbcTemplate.update(
                        "INSERT INTO posts (user_id, post_type, content, visibility) VALUES (?, ?, ?, ?)",
                        userA, "prayer_request", "test", "invalid_visibility");
                case "posts_moderation_status_check" ->
                    jdbcTemplate.update(
                        "INSERT INTO posts (user_id, post_type, content, moderation_status) VALUES (?, ?, ?, ?)",
                        userA, "prayer_request", "test", "invalid_status");
                case "posts_soft_delete_consistency" ->
                    // is_deleted=TRUE with deleted_at=NULL is the illegal pair.
                    jdbcTemplate.update(
                        "INSERT INTO posts (user_id, post_type, content, is_deleted, deleted_at) VALUES (?, ?, ?, ?, ?)",
                        userA, "prayer_request", "test", true, null);
                case "posts_answered_consistency" ->
                    jdbcTemplate.update(
                        "INSERT INTO posts (user_id, post_type, content, is_answered, answered_at) VALUES (?, ?, ?, ?, ?)",
                        userA, "prayer_request", "test", true, null);
                case "post_comments_moderation_status_check" -> {
                    UUID postId = insertTestPost(userA);
                    jdbcTemplate.update(
                        "INSERT INTO post_comments (post_id, user_id, content, moderation_status) VALUES (?, ?, ?, ?)",
                        postId, userA, "test", "invalid_status");
                }
                case "post_comments_soft_delete_consistency" -> {
                    UUID postId = insertTestPost(userA);
                    jdbcTemplate.update(
                        "INSERT INTO post_comments (post_id, user_id, content, is_deleted, deleted_at) VALUES (?, ?, ?, ?, ?)",
                        postId, userA, "test", true, null);
                }
                case "post_reactions_reaction_type_check" -> {
                    // 'praising' is rejected per Spec Divergence 3 — Phase 6.6
                    // adds it via an ALTER changeset; Phase 3 must reject it.
                    UUID postId = insertTestPost(userA);
                    jdbcTemplate.update(
                        "INSERT INTO post_reactions (post_id, user_id, reaction_type) VALUES (?, ?, ?)",
                        postId, userA, "praising");
                }
                case "post_reports_target_xor_check_both_set" -> {
                    UUID postId = insertTestPost(userA);
                    UUID commentId = UUID.randomUUID();
                    jdbcTemplate.update(
                        "INSERT INTO post_comments (id, post_id, user_id, content) VALUES (?, ?, ?, ?)",
                        commentId, postId, userA, "test");
                    jdbcTemplate.update(
                        "INSERT INTO post_reports (post_id, comment_id, reporter_id, reason) VALUES (?, ?, ?, ?)",
                        postId, commentId, userA, "spam");
                }
                case "post_reports_target_xor_check_neither_set" ->
                    jdbcTemplate.update(
                        "INSERT INTO post_reports (post_id, comment_id, reporter_id, reason) VALUES (?, ?, ?, ?)",
                        null, null, userA, "spam");
                case "post_reports_status_check" -> {
                    UUID postId = insertTestPost(userA);
                    jdbcTemplate.update(
                        "INSERT INTO post_reports (post_id, reporter_id, reason, status) VALUES (?, ?, ?, ?)",
                        postId, userA, "spam", "invalid_status");
                }
                case "post_reports_review_consistency" -> {
                    // status='reviewed' requires reviewer_id AND reviewed_at to be non-null.
                    UUID postId = insertTestPost(userA);
                    jdbcTemplate.update(
                        "INSERT INTO post_reports (post_id, reporter_id, reason, status, reviewer_id) VALUES (?, ?, ?, ?, ?)",
                        postId, userA, "spam", "reviewed", null);
                }
                case "qotd_questions_theme_check" ->
                    jdbcTemplate.update(
                        "INSERT INTO qotd_questions (id, text, theme, display_order) VALUES (?, ?, ?, ?)",
                        "test-q-" + UUID.randomUUID(), "test?", "invalid_theme", 999_000 + (int) (Math.random() * 1000));
                default ->
                    throw new IllegalStateException("Unhandled case: " + caseName);
            }
        }).isInstanceOf(DataIntegrityViolationException.class)
          .satisfies(ex -> assertThat(ex.getMessage()).containsAnyOf(acceptableConstraintNames));
    }

    @ParameterizedTest(name = "deleting user cascades rows from {0}")
    @CsvSource({
        "posts",
        "post_comments",
        "post_reactions",
        "post_bookmarks",
        "post_reports"
    })
    void phase3TableCascadesOnUserDelete(String tableName) {
        UUID userA = insertTestUser("phase3-cascade-" + tableName + "-a");

        // For child tables (post_comments, post_reactions, post_bookmarks,
        // post_reports), seed a parent post owned by userA so the cascade
        // can be verified on the child row's user/reporter column.
        switch (tableName) {
            case "posts" ->
                jdbcTemplate.update(
                    "INSERT INTO posts (user_id, post_type, content) VALUES (?, ?, ?)",
                    userA, "prayer_request", "test");
            case "post_comments" -> {
                UUID postId = insertTestPost(userA);
                jdbcTemplate.update(
                    "INSERT INTO post_comments (post_id, user_id, content) VALUES (?, ?, ?)",
                    postId, userA, "test");
            }
            case "post_reactions" -> {
                UUID postId = insertTestPost(userA);
                jdbcTemplate.update(
                    "INSERT INTO post_reactions (post_id, user_id, reaction_type) VALUES (?, ?, ?)",
                    postId, userA, "praying");
            }
            case "post_bookmarks" -> {
                UUID postId = insertTestPost(userA);
                jdbcTemplate.update(
                    "INSERT INTO post_bookmarks (post_id, user_id) VALUES (?, ?)",
                    postId, userA);
            }
            case "post_reports" -> {
                UUID postId = insertTestPost(userA);
                jdbcTemplate.update(
                    "INSERT INTO post_reports (post_id, reporter_id, reason) VALUES (?, ?, ?)",
                    postId, userA, "spam");
            }
            default ->
                throw new IllegalStateException("Unhandled table: " + tableName);
        }

        String userColumn = switch (tableName) {
            case "posts", "post_comments", "post_reactions", "post_bookmarks" -> "user_id";
            case "post_reports" -> "reporter_id";
            default -> throw new IllegalStateException("Unhandled table: " + tableName);
        };
        Integer beforeCount = jdbcTemplate.queryForObject(
            "SELECT COUNT(*) FROM " + tableName + " WHERE " + userColumn + " = ?",
            Integer.class, userA
        );
        assertThat(beforeCount).isEqualTo(1);

        // Delete userA — cascade should remove the row.
        jdbcTemplate.update("DELETE FROM users WHERE id = ?", userA);

        Integer afterCount = jdbcTemplate.queryForObject(
            "SELECT COUNT(*) FROM " + tableName + " WHERE " + userColumn + " = ?",
            Integer.class, userA
        );
        assertThat(afterCount).isEqualTo(0);
    }

    @Test
    void postReportsReviewerSetsNullOnUserDelete() {
        UUID reporter = insertTestUser("reviewer-setnull-reporter");
        UUID moderator = insertTestUser("reviewer-setnull-moderator");
        UUID postId = insertTestPost(reporter);

        UUID reportId = UUID.randomUUID();
        jdbcTemplate.update(
            "INSERT INTO post_reports (id, post_id, reporter_id, reason, status, reviewer_id, reviewed_at) " +
            "VALUES (?, ?, ?, ?, ?, ?, NOW())",
            reportId, postId, reporter, "spam", "reviewed", moderator
        );

        Map<String, Object> beforeRow = jdbcTemplate.queryForMap(
            "SELECT reviewer_id, reviewed_at, status FROM post_reports WHERE id = ?",
            reportId
        );
        assertThat(beforeRow.get("reviewer_id")).isEqualTo(moderator);
        assertThat(beforeRow.get("reviewed_at")).isNotNull();

        // Delete the moderator. The report row must survive — its audit trail
        // (reviewed_at, action_taken) is preserved while reviewer_id is set
        // to NULL by the FK cascade. Postgres re-fires CHECK constraints on
        // cascade UPDATE, so post_reports_review_consistency is intentionally
        // permissive on the closed branch (`status IN (closed) AND reviewed_at
        // IS NOT NULL`) to accommodate this orphaned-reviewer state without
        // blocking the cascade.
        jdbcTemplate.update("DELETE FROM users WHERE id = ?", moderator);

        Map<String, Object> afterRow = jdbcTemplate.queryForMap(
            "SELECT reviewer_id, reviewed_at, status FROM post_reports WHERE id = ?",
            reportId
        );
        assertThat(afterRow.get("reviewer_id")).isNull();
        assertThat(afterRow.get("reviewed_at")).isNotNull();
        assertThat(afterRow.get("status")).isEqualTo("reviewed");
    }

    @Test
    void postCommentsParentReferenceCascades() {
        UUID userA = insertTestUser("parent-cascade");
        UUID postId = insertTestPost(userA);

        UUID parentCommentId = UUID.randomUUID();
        jdbcTemplate.update(
            "INSERT INTO post_comments (id, post_id, user_id, content) VALUES (?, ?, ?, ?)",
            parentCommentId, postId, userA, "parent"
        );

        jdbcTemplate.update(
            "INSERT INTO post_comments (post_id, user_id, parent_comment_id, content) VALUES (?, ?, ?, ?)",
            postId, userA, parentCommentId, "child"
        );

        Integer beforeCount = jdbcTemplate.queryForObject(
            "SELECT COUNT(*) FROM post_comments WHERE post_id = ?",
            Integer.class, postId
        );
        assertThat(beforeCount).isEqualTo(2);

        jdbcTemplate.update("DELETE FROM post_comments WHERE id = ?", parentCommentId);

        Integer afterCount = jdbcTemplate.queryForObject(
            "SELECT COUNT(*) FROM post_comments WHERE post_id = ?",
            Integer.class, postId
        );
        assertThat(afterCount).isEqualTo(0);
    }

    @AfterEach
    void cleanupCheckTestUsers() {
        // ON DELETE CASCADE on every FK to users.id means deleting the parent
        // user rows transitively clears any child rows the parameterized
        // CHECK-rejection test may have left behind. Targets only emails with
        // the check-test- prefix so other tests' fixtures are untouched.
        jdbcTemplate.update("DELETE FROM users WHERE email LIKE 'check-test-%'");
    }

    @AfterEach
    void cleanupPhase3QotdTestRows() {
        // qotd_questions is a self-contained content table — no FK to users —
        // so cleanupCheckTestUsers does NOT transitively clear test rows here.
        // The phase3CheckConstraintRejectsInvalidValue case for the theme CHECK
        // inserts a 'test-q-' prefixed row whose CHECK violation aborts the
        // INSERT before it reaches the heap, BUT a future test that crafts a
        // valid row (or the prefix is reused) would leak. Sweep on the same
        // prefix the test uses to keep the table empty between invocations.
        jdbcTemplate.update("DELETE FROM qotd_questions WHERE id LIKE 'test-q-%'");
    }

    @ParameterizedTest(name = "{0} rejects invalid value")
    @CsvSource({
        "faith_points_total_points_nonneg_check",
        "faith_points_current_level_positive_check",
        "streak_state_current_streak_nonneg_check",
        "streak_state_longest_streak_nonneg_check",
        "streak_state_grace_days_used_nonneg_check",
        "user_badges_display_count_positive_check",
        "activity_counts_count_value_nonneg_check"
    })
    void checkConstraintRejectsInvalidValue(String constraintName) {
        UUID userId = insertTestUser(constraintName);

        assertThatThrownBy(() -> {
            switch (constraintName) {
                case "faith_points_total_points_nonneg_check" ->
                    jdbcTemplate.update(
                        "INSERT INTO faith_points (user_id, total_points) VALUES (?, ?)",
                        userId, -1);
                case "faith_points_current_level_positive_check" ->
                    jdbcTemplate.update(
                        "INSERT INTO faith_points (user_id, current_level) VALUES (?, ?)",
                        userId, 0);
                case "streak_state_current_streak_nonneg_check" ->
                    jdbcTemplate.update(
                        "INSERT INTO streak_state (user_id, current_streak) VALUES (?, ?)",
                        userId, -1);
                case "streak_state_longest_streak_nonneg_check" ->
                    jdbcTemplate.update(
                        "INSERT INTO streak_state (user_id, longest_streak) VALUES (?, ?)",
                        userId, -1);
                case "streak_state_grace_days_used_nonneg_check" ->
                    jdbcTemplate.update(
                        "INSERT INTO streak_state (user_id, grace_days_used) VALUES (?, ?)",
                        userId, -1);
                case "user_badges_display_count_positive_check" ->
                    jdbcTemplate.update(
                        "INSERT INTO user_badges (user_id, badge_id, display_count) VALUES (?, ?, ?)",
                        userId, "test_badge", 0);
                case "activity_counts_count_value_nonneg_check" ->
                    jdbcTemplate.update(
                        "INSERT INTO activity_counts (user_id, count_type, count_value) VALUES (?, ?, ?)",
                        userId, "test_count", -1);
                default ->
                    throw new IllegalStateException("Unhandled constraint: " + constraintName);
            }
        }).isInstanceOf(DataIntegrityViolationException.class)
          .hasMessageContaining(constraintName);
    }

    private UUID insertTestUser(String emailSuffix) {
        UUID id = UUID.randomUUID();
        jdbcTemplate.update(
            "INSERT INTO users (id, email, password_hash, first_name, last_name) " +
            "VALUES (?, ?, ?, ?, ?)",
            id, "check-test-" + emailSuffix + "@example.com",
            "bcrypt-placeholder", "Test", "User"
        );
        return id;
    }

    private UUID insertTestPost(UUID userId) {
        UUID id = UUID.randomUUID();
        jdbcTemplate.update(
            "INSERT INTO posts (id, user_id, post_type, content) VALUES (?, ?, ?, ?)",
            id, userId, "prayer_request", "test post"
        );
        return id;
    }
}
