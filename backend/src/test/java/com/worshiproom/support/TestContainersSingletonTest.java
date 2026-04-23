package com.worshiproom.support;

import org.junit.jupiter.api.Test;
import org.testcontainers.containers.PostgreSQLContainer;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Self-tests for {@link TestContainers}. Verifies the singleton container is started, the
 * same instance is returned on every access, and the JDBC URL has the expected shape.
 *
 * <p>These tests do NOT extend {@link AbstractIntegrationTest} or {@link AbstractDataJpaTest}
 * — they assert properties of the utility class itself, not of any Spring context.
 */
class TestContainersSingletonTest {

    @Test
    void containerIsRunning() {
        assertThat(TestContainers.POSTGRES.isRunning()).isTrue();
    }

    @Test
    void sameInstanceReturnedOnRepeatedAccess() {
        PostgreSQLContainer<?> first = TestContainers.POSTGRES;
        PostgreSQLContainer<?> second = TestContainers.POSTGRES;
        assertThat(first).isSameAs(second);
    }

    @Test
    void jdbcUrlHasExpectedShape() {
        String jdbcUrl = TestContainers.POSTGRES.getJdbcUrl();
        // Format: jdbc:postgresql://<host>:<mapped-port>/worshiproom_test[?...]
        assertThat(jdbcUrl)
            .startsWith("jdbc:postgresql://")
            .contains("/worshiproom_test");
    }

    @Test
    void credentialsMatchConfiguredValues() {
        assertThat(TestContainers.POSTGRES.getUsername()).isEqualTo("test");
        assertThat(TestContainers.POSTGRES.getPassword()).isEqualTo("test");
        assertThat(TestContainers.POSTGRES.getDatabaseName()).isEqualTo("worshiproom_test");
    }
}
