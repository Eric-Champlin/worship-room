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

        assertThat(columns).hasSize(21);
        assertThat(columns).extracting("column_name")
            .containsExactly(
                "id", "email", "password_hash", "first_name", "last_name",
                "display_name_preference", "custom_display_name", "avatar_url", "bio",
                "favorite_verse_reference", "favorite_verse_text",
                "is_admin", "is_banned", "is_email_verified",
                "joined_at", "last_active_at", "created_at", "updated_at",
                "is_deleted", "deleted_at",
                "timezone"
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
        assertThat(rows).hasSize(13);

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

    @AfterEach
    void cleanupCheckTestUsers() {
        // ON DELETE CASCADE on every FK to users.id means deleting the parent
        // user rows transitively clears any child rows the parameterized
        // CHECK-rejection test may have left behind. Targets only emails with
        // the check-test- prefix so other tests' fixtures are untouched.
        jdbcTemplate.update("DELETE FROM users WHERE email LIKE 'check-test-%'");
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
}
