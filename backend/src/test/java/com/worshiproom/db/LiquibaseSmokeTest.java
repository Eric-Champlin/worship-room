package com.worshiproom.db;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.containers.wait.strategy.Wait;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;

import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/**
 * Smoke test verifying Liquibase applies cleanly against a fresh PostgreSQL 16 container
 * and the canonical users table (Spec 1.3) materializes with the expected shape.
 *
 * <p>This test stands alone. When Spec 1.7 introduces {@code AbstractIntegrationTest}, a
 * follow-up refactor in that spec will migrate this class to extend the new base.
 *
 * <p>Requires Docker to be running locally. Matches the pattern documented in
 * {@code .claude/rules/06-testing.md} § Testcontainers Setup Pattern.
 */
@SpringBootTest
@Testcontainers
class LiquibaseSmokeTest {

    @Container
    static PostgreSQLContainer<?> postgres = new PostgreSQLContainer<>("postgres:16-alpine")
        .withDatabaseName("worshiproom_test")
        .withUsername("test")
        .withPassword("test")
        // Wait for TCP port to actually accept host connections. The default
        // log-message strategy can signal ready before Docker Desktop on Mac
        // finishes publishing the mapped port — caused ~2s connection-refused
        // races during Spec 1.3 bring-up. Belt-and-suspenders for container probe.
        .waitingFor(Wait.forListeningPort());

    @DynamicPropertySource
    static void configureProperties(DynamicPropertyRegistry registry) {
        registry.add("spring.datasource.url", postgres::getJdbcUrl);
        registry.add("spring.datasource.username", postgres::getUsername);
        registry.add("spring.datasource.password", postgres::getPassword);
    }

    @Autowired
    private JdbcTemplate jdbcTemplate;

    @Test
    void usersTableExistsWithAllDecision3Columns() {
        List<Map<String, Object>> columns = jdbcTemplate.queryForList(
            "SELECT column_name, data_type, is_nullable FROM information_schema.columns " +
            "WHERE table_schema = 'public' AND table_name = 'users' " +
            "ORDER BY ordinal_position"
        );

        assertThat(columns).hasSize(20);
        assertThat(columns).extracting("column_name")
            .containsExactly(
                "id", "email", "password_hash", "first_name", "last_name",
                "display_name_preference", "custom_display_name", "avatar_url", "bio",
                "favorite_verse_reference", "favorite_verse_text",
                "is_admin", "is_banned", "is_email_verified",
                "joined_at", "last_active_at", "created_at", "updated_at",
                "is_deleted", "deleted_at"
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
    void liquibaseChangelogRecordsExactlyOneChangeset() {
        List<Map<String, Object>> rows = jdbcTemplate.queryForList(
            "SELECT id, author, filename FROM databasechangelog ORDER BY orderexecuted"
        );
        assertThat(rows).hasSize(1);
        Map<String, Object> row = rows.get(0);
        assertThat(row.get("id")).isEqualTo("2026-04-23-001-create-users-table");
        assertThat(row.get("author")).isEqualTo("worship-room");
        assertThat((String) row.get("filename"))
            .endsWith("2026-04-23-001-create-users-table.xml");
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
