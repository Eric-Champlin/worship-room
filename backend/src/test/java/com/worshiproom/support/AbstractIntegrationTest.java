package com.worshiproom.support;

import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;

/**
 * Base class for backend integration tests that need the full Spring application context.
 *
 * <p>Wires the {@link TestContainers#POSTGRES singleton PostgreSQL container} so every
 * subclass shares one container for the lifetime of the JVM. Full-suite runtime dropped from
 * ~85–95 s (per-class containers) to ≤ 40 s (singleton) — see Spec 1.7 acceptance criteria.
 *
 * <p>Subclasses that need additional dynamic properties (e.g. {@code jwt.secret},
 * {@code auth.rate-limit.*}) may declare their own static {@code @DynamicPropertySource}
 * method with a distinct name — Spring aggregates across the inheritance hierarchy, so the
 * base's JDBC registration AND the subclass's registration both run. Keep subclass property
 * names stable; do NOT reuse {@link #registerBaseDatasourceProperties} as the method name
 * in a subclass (static method hiding makes the intent ambiguous).
 *
 * <p><b>Entity-state cleanup reminder.</b> The singleton container is shared across every
 * test class in the JVM run. Rows INSERTed by one test class persist into the next unless
 * explicitly cleaned. Full-context tests that mutate data MUST clean up in {@code @BeforeEach}
 * (e.g. {@code userRepository.deleteAll()}) or use {@code @Transactional} with auto-rollback.
 * The cleanup responsibility is on the subclass — the base class cannot know which tables
 * your test touches.
 *
 * <p>For repository-slice tests, extend {@link AbstractDataJpaTest} instead — it uses
 * {@code @DataJpaTest} + {@code @AutoConfigureTestDatabase(replace = Replace.NONE)} and gets
 * per-test transactional rollback automatically.
 */
@SpringBootTest
public abstract class AbstractIntegrationTest {

    @DynamicPropertySource
    static void registerBaseDatasourceProperties(DynamicPropertyRegistry registry) {
        TestContainers.registerJdbcProperties(registry);
    }

    // Prevents dev-seed from leaking into test runs when dev profile is active — see Spec 1.8.
    /**
     * Override {@code spring.liquibase.contexts} to {@code "test"} so the dev-only seed
     * changeset (Spec 1.8, {@code contexts/dev-seed.xml}, {@code context="dev"}) is SKIPPED
     * during test runs.
     *
     * <p>Tests inherit the dev profile by default via {@code spring.profiles.default=dev} in
     * {@code application.properties}, which would otherwise apply the dev-seed to the shared
     * singleton container and leak 5 user rows across every integration test class.
     *
     * <p>Liquibase context semantics: when the filter is set to {@code "test"} (a value no
     * changeset currently uses), only no-context changesets run; every changeset with an
     * explicit context — dev-seed included — is skipped. A future {@code contexts/test-seed.xml}
     * would use {@code context="test"} if ever added; this override would then include it
     * automatically without any base-class change.
     */
    @DynamicPropertySource
    static void registerLiquibaseTestContext(DynamicPropertyRegistry registry) {
        registry.add("spring.liquibase.contexts", () -> "test");
    }

    /**
     * Cap HikariCP per-context connection pool to 3 in tests so the suite can run more
     * concurrent Spring application contexts without exhausting the Testcontainers
     * Postgres' default {@code max_connections=100}.
     *
     * <p>Each {@code @SpringBootTest} class typically creates its own cached context
     * (cache key includes property values). With Spring Boot's HikariCP default pool of
     * 10 connections per context, ~10 contexts saturate Postgres before any test runs.
     * Spec 2.5.3 added two new context-loading test classes that pushed the suite over
     * that ceiling and triggered {@code FATAL: sorry, too many clients already} during
     * Liquibase migration.
     *
     * <p>3 connections per context is sufficient for tests because they execute
     * synchronously and rarely hold more than one connection at a time. Production uses
     * its own profile-specific Hikari sizing — this override scopes only to tests.
     *
     * <p><b>Overriding for tests that need more connections:</b> If a future test class
     * legitimately needs concurrent DB ops (multi-threaded transaction-isolation tests,
     * async job tests, etc.), declare a sibling {@code @DynamicPropertySource} method on
     * the subclass with a method name distinct from this base method's. Spring aggregates
     * {@code @DynamicPropertySource} methods across the inheritance hierarchy and the
     * subclass's {@code add()} calls overwrite the base values for the same property key:
     * <pre>
     * &#64;DynamicPropertySource
     * static void overrideHikariPool(DynamicPropertyRegistry registry) {
     *     registry.add("spring.datasource.hikari.maximum-pool-size", () -&gt; "10");
     * }
     * </pre>
     * Watch for {@code FATAL: sorry, too many clients already} in test logs as the
     * canonical symptom of a new context exceeding Postgres' {@code max_connections=100}.
     */
    @DynamicPropertySource
    static void registerHikariTestPoolCap(DynamicPropertyRegistry registry) {
        registry.add("spring.datasource.hikari.maximum-pool-size", () -> "3");
        registry.add("spring.datasource.hikari.minimum-idle", () -> "1");
    }
}
