package com.worshiproom.storage;

import org.junit.jupiter.api.Test;
import org.springframework.boot.autoconfigure.AutoConfigurations;
import org.springframework.boot.autoconfigure.context.ConfigurationPropertiesAutoConfiguration;
import org.springframework.boot.test.context.runner.ApplicationContextRunner;
import org.springframework.core.env.Environment;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Verifies that {@link S3StorageAdapter#initialize()} throws {@link IllegalStateException}
 * with a message naming missing {@code STORAGE_*} env vars when the prod profile is active and
 * any required value is blank.
 *
 * <p>Uses {@link ApplicationContextRunner} (not {@code @SpringBootTest}) so the test can
 * isolate the storage beans without booting the full app context — same approach as
 * {@link StoragePropertiesTest}.
 *
 * <p><b>Test profile boundary:</b> deliberately exercises only the {@code prod} branch. The
 * {@code test} profile (real MinIO via {@link S3StorageAdapterIntegrationTest}) is the
 * happy-path counterpart.
 */
class ProductionFailFastTest {

    private final ApplicationContextRunner contextRunner = new ApplicationContextRunner()
            .withConfiguration(AutoConfigurations.of(ConfigurationPropertiesAutoConfiguration.class))
            .withUserConfiguration(StorageProperties.class, S3AdapterTestConfig.class);

    @Test
    void prodProfileWithoutEnvVars_failsToStart() {
        contextRunner
                .withPropertyValues("spring.profiles.active=prod")
                // Deliberately omit worshiproom.storage.* — values default to empty strings.
                .run(ctx -> {
                    assertThat(ctx).hasFailed();
                    Throwable failure = ctx.getStartupFailure();
                    assertThat(failure)
                            .as("startup must fail")
                            .isNotNull();
                    assertThat(rootCauseMessage(failure))
                            .as("error must name the missing env vars")
                            .contains("STORAGE_BUCKET")
                            .contains("STORAGE_ACCESS_KEY")
                            .contains("STORAGE_SECRET_KEY")
                            .contains("STORAGE_ENDPOINT_URL");
                });
    }

    @Test
    void prodProfileWithAllEnvVars_succeeds() {
        contextRunner
                .withPropertyValues(
                        "spring.profiles.active=prod",
                        "worshiproom.storage.bucket=prod-bucket",
                        "worshiproom.storage.region=auto",
                        "worshiproom.storage.access-key=key",
                        "worshiproom.storage.secret-key=secret",
                        "worshiproom.storage.endpoint-url=https://example.r2.cloudflarestorage.com")
                .run(ctx -> {
                    assertThat(ctx).hasNotFailed();
                    assertThat(ctx).hasSingleBean(S3StorageAdapter.class);
                });
    }

    @Test
    void devProfileWithoutEnvVars_doesNotInstantiateS3Adapter() {
        // Under dev profile, the StorageConfig registers LocalFilesystem — S3StorageAdapter
        // is not constructed at all, so there is no fail-fast trip.
        contextRunner
                .withPropertyValues("spring.profiles.active=dev")
                .run(ctx -> {
                    assertThat(ctx).hasNotFailed();
                    assertThat(ctx.getBeansOfType(S3StorageAdapter.class)).isEmpty();
                });
    }

    private static String rootCauseMessage(Throwable t) {
        Throwable cur = t;
        while (cur.getCause() != null && cur.getCause() != cur) {
            cur = cur.getCause();
        }
        return cur.getMessage() == null ? "" : cur.getMessage();
    }

    /**
     * Test-only configuration that wires {@link S3StorageAdapter} directly so we can verify
     * the fail-fast path without pulling in the full {@link StorageConfig} (which only
     * registers an adapter for dev/test/prod and would also fall through if no profile
     * matches — but we want explicit prod-only behavior here).
     */
    @org.springframework.context.annotation.Configuration
    static class S3AdapterTestConfig {
        @org.springframework.context.annotation.Bean
        @org.springframework.context.annotation.Profile("prod")
        public S3StorageAdapter prodAdapter(StorageProperties props, Environment env) {
            return new S3StorageAdapter(props, env);
        }
    }
}
