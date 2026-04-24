package com.worshiproom.db;

import com.worshiproom.support.AbstractIntegrationTest;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.jdbc.core.JdbcTemplate;

import java.util.List;
import java.util.Map;

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
        assertThat(rows).hasSize(2);

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
}
