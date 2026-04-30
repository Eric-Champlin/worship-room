package com.worshiproom.auth;

import com.worshiproom.support.AbstractIntegrationTest;
import com.worshiproom.user.User;
import com.worshiproom.user.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;

import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Verifies that Spec 1.5f changeset
 * {@code 2026-04-30-002-add-users-account-lockout-columns} applies cleanly:
 * the three lockout columns exist with correct types and defaults, and a
 * freshly-inserted user gets count=0 / null timestamps.
 */
class LiquibaseAccountLockoutColumnsTest extends AbstractIntegrationTest {

    private static final String TEST_JWT_SECRET =
        "test-jwt-secret-at-least-32-bytes-long-xxxxxxxxxxxxxx";

    @DynamicPropertySource
    static void properties(DynamicPropertyRegistry registry) {
        registry.add("jwt.secret", () -> TEST_JWT_SECRET);
    }

    @Autowired private JdbcTemplate jdbcTemplate;
    @Autowired private UserRepository userRepository;

    @BeforeEach
    void clean() { userRepository.deleteAll(); }

    @Test
    void migrationApplies() {
        List<Map<String, Object>> columns = jdbcTemplate.queryForList(
            "SELECT column_name, data_type, is_nullable, column_default " +
            "FROM information_schema.columns " +
            "WHERE table_schema = 'public' AND table_name = 'users' " +
            "AND column_name IN ('failed_login_count', 'failed_login_window_start', 'locked_until')"
        );

        assertThat(columns).hasSize(3);

        Map<String, Object> count = columns.stream()
            .filter(c -> "failed_login_count".equals(c.get("column_name"))).findFirst().orElseThrow();
        assertThat(count.get("data_type")).isEqualTo("integer");
        assertThat(count.get("is_nullable")).isEqualTo("NO");
        assertThat((String) count.get("column_default")).contains("0");

        Map<String, Object> windowStart = columns.stream()
            .filter(c -> "failed_login_window_start".equals(c.get("column_name"))).findFirst().orElseThrow();
        assertThat(windowStart.get("data_type")).isEqualTo("timestamp with time zone");
        assertThat(windowStart.get("is_nullable")).isEqualTo("YES");

        Map<String, Object> lockedUntil = columns.stream()
            .filter(c -> "locked_until".equals(c.get("column_name"))).findFirst().orElseThrow();
        assertThat(lockedUntil.get("data_type")).isEqualTo("timestamp with time zone");
        assertThat(lockedUntil.get("is_nullable")).isEqualTo("YES");
    }

    @Test
    void existingRowsGetDefaultZero() {
        User user = new User(
            "lockout-defaults@example.com",
            "$2a$10$placeholderhashforinsertonlydoesntmatterforthistest",
            "Test", "User", "UTC");
        User saved = userRepository.save(user);

        User reloaded = userRepository.findById(saved.getId()).orElseThrow();
        assertThat(reloaded.getFailedLoginCount()).isEqualTo(0);
        assertThat(reloaded.getFailedLoginWindowStart()).isNull();
        assertThat(reloaded.getLockedUntil()).isNull();
    }
}
