package com.worshiproom.db;

import com.worshiproom.support.AbstractIntegrationTest;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.jdbc.core.JdbcTemplate;

import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Verifies the Spec 1.10f schema additions — terms_version and privacy_version
 * columns on the users table — match the JPA entity expectations.
 */
class LiquibaseLegalColumnsTest extends AbstractIntegrationTest {

    @Autowired
    private JdbcTemplate jdbcTemplate;

    @Test
    void termsVersionColumnExistsAndIsNullable() {
        Map<String, Object> col = jdbcTemplate.queryForMap(
            "SELECT data_type, character_maximum_length, is_nullable " +
            "FROM information_schema.columns " +
            "WHERE table_schema = 'public' AND table_name = 'users' " +
            "AND column_name = 'terms_version'"
        );

        assertThat(col.get("data_type")).isEqualTo("character varying");
        assertThat(col.get("character_maximum_length")).isEqualTo(20);
        assertThat(col.get("is_nullable")).isEqualTo("YES");
    }

    @Test
    void privacyVersionColumnExistsAndIsNullable() {
        Map<String, Object> col = jdbcTemplate.queryForMap(
            "SELECT data_type, character_maximum_length, is_nullable " +
            "FROM information_schema.columns " +
            "WHERE table_schema = 'public' AND table_name = 'users' " +
            "AND column_name = 'privacy_version'"
        );

        assertThat(col.get("data_type")).isEqualTo("character varying");
        assertThat(col.get("character_maximum_length")).isEqualTo(20);
        assertThat(col.get("is_nullable")).isEqualTo("YES");
    }
}
