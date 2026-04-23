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
}
