package com.worshiproom.support;

import org.springframework.boot.test.autoconfigure.jdbc.AutoConfigureTestDatabase;
import org.springframework.boot.test.autoconfigure.jdbc.AutoConfigureTestDatabase.Replace;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;

/**
 * Base class for JPA repository slice tests.
 *
 * <p>Uses {@code @DataJpaTest} — loads a minimal JPA-only Spring context (repositories,
 * {@code EntityManager}, JPA infrastructure; NO controllers, services, security, or MVC) —
 * plus {@code @AutoConfigureTestDatabase(replace = Replace.NONE)} so Spring Boot does NOT
 * try to wire an embedded H2 database. Without the {@code replace = NONE}, the embedded
 * database takes precedence and the Testcontainers-provided JDBC properties are ignored.
 *
 * <p>Shares the {@link TestContainers#POSTGRES singleton PostgreSQL container} with
 * {@link AbstractIntegrationTest}. One container serves both families of tests for the JVM
 * run — Ryuk handles JVM-exit cleanup.
 *
 * <p>{@code @DataJpaTest} wraps each test method in a transaction that rolls back at the end,
 * so entity-state cleanup between tests is automatic. Subclasses do NOT need a
 * {@code @BeforeEach} cleanup hook for the tables they write to from within a test method.
 *
 * <p>For full-context integration tests (controllers, MockMvc, security filters), extend
 * {@link AbstractIntegrationTest} instead.
 */
@DataJpaTest
@AutoConfigureTestDatabase(replace = Replace.NONE)
public abstract class AbstractDataJpaTest {

    @DynamicPropertySource
    static void registerBaseDatasourceProperties(DynamicPropertyRegistry registry) {
        TestContainers.registerJdbcProperties(registry);
    }
}
