package com.worshiproom.support;

import org.springframework.test.context.DynamicPropertyRegistry;
import org.testcontainers.containers.GenericContainer;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.containers.wait.strategy.Wait;

/**
 * Singleton PostgreSQL 16 container shared across the entire JVM test run.
 *
 * <p>Started once in a static initializer block on first class load, reused by every
 * {@code AbstractIntegrationTest} / {@code AbstractDataJpaTest} subclass for the lifetime
 * of the JVM. Testcontainers' Ryuk sidecar handles cleanup when the JVM exits — do NOT add
 * a manual {@code @AfterAll} stop hook.
 *
 * <p>Uses {@code Wait.forListeningPort()} instead of the default log-message wait strategy.
 * The default can signal "ready" before Docker Desktop on Mac finishes publishing the mapped
 * port — this caused ~2 s connection-refused races during Spec 1.3 bring-up. The listening-port
 * probe is belt-and-suspenders against that race and must be preserved.
 *
 * <p>Container reuse ({@code .withReuse(true)}) is opt-in only. Default is disabled so CI
 * starts a fresh container per run. Developers who want faster local iteration may opt in by
 * adding this line to {@code ~/.testcontainers.properties}:
 *
 * <pre>
 * testcontainers.reuse.enable=true
 * </pre>
 *
 * CI must never enable reuse — test runs should be fully isolated.
 *
 * <p>DO NOT instantiate this class. Access the container via {@link #POSTGRES} directly, or
 * register JDBC properties via {@link #registerJdbcProperties(DynamicPropertyRegistry)}.
 */
@SuppressWarnings("resource") // Singleton lifetime == JVM; Ryuk handles cleanup at JVM exit.
public final class TestContainers {

    public static final PostgreSQLContainer<?> POSTGRES;

    /** Singleton Redis 7 container shared across the JVM (Spec 5.6). Same lifecycle as POSTGRES. */
    public static final GenericContainer<?> REDIS;

    static {
        POSTGRES = new PostgreSQLContainer<>("postgres:16-alpine")
            .withDatabaseName("worshiproom_test")
            .withUsername("test")
            .withPassword("test")
            .waitingFor(Wait.forListeningPort());
        POSTGRES.start();

        REDIS = new GenericContainer<>("redis:7-alpine")
            .withExposedPorts(6379)
            .waitingFor(Wait.forListeningPort());
        REDIS.start();
    }

    /**
     * Registers the singleton container's JDBC URL, username, and password against a
     * {@link DynamicPropertyRegistry}. Called from {@code AbstractIntegrationTest} and
     * {@code AbstractDataJpaTest} base classes.
     *
     * <p>Subclasses may declare their own additional {@code @DynamicPropertySource} methods
     * to register test-specific properties (e.g. {@code jwt.secret},
     * {@code auth.rate-limit.*}). Spring Framework ≥ 5.3 aggregates
     * {@code @DynamicPropertySource} methods across the inheritance hierarchy — both the
     * base's registration and the subclass's registration will run.
     */
    public static void registerJdbcProperties(DynamicPropertyRegistry registry) {
        registry.add("spring.datasource.url", POSTGRES::getJdbcUrl);
        registry.add("spring.datasource.username", POSTGRES::getUsername);
        registry.add("spring.datasource.password", POSTGRES::getPassword);
    }

    /**
     * Registers the singleton Redis container's host/port against a
     * {@link DynamicPropertyRegistry}. Caller-supplied — base classes do NOT register Redis
     * properties by default, because most integration tests don't need Redis. Spec 5.6 tests
     * that exercise Redis explicitly opt in by calling this method from their own
     * {@code @DynamicPropertySource} hook.
     */
    public static void registerRedisProperties(DynamicPropertyRegistry registry) {
        registry.add("spring.data.redis.host", REDIS::getHost);
        registry.add("spring.data.redis.port", () -> REDIS.getMappedPort(6379));
        registry.add("spring.data.redis.password", () -> "");
        // Explicit empty so a stray REDIS_URL env var doesn't shadow the triplet during tests.
        registry.add("spring.data.redis.url", () -> "");
    }

    private TestContainers() {
        throw new AssertionError("TestContainers is a static-only utility; do not instantiate");
    }
}
