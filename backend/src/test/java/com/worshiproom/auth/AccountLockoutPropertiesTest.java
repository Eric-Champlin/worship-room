package com.worshiproom.auth;

import org.junit.jupiter.api.Test;
import org.springframework.boot.autoconfigure.AutoConfigurations;
import org.springframework.boot.autoconfigure.context.ConfigurationPropertiesAutoConfiguration;
import org.springframework.boot.autoconfigure.validation.ValidationAutoConfiguration;
import org.springframework.boot.test.context.runner.ApplicationContextRunner;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Validates {@link AccountLockoutProperties} binding from {@code auth.lockout.*}
 * and {@code @Min(1)} validation enforcement (Spec 1.5f).
 *
 * <p>Uses {@link ApplicationContextRunner} (not {@code @SpringBootTest}) — pure
 * property-binding test, no PostgreSQL required. Mirrors {@code StoragePropertiesTest}.
 */
class AccountLockoutPropertiesTest {

    private final ApplicationContextRunner contextRunner = new ApplicationContextRunner()
        .withConfiguration(AutoConfigurations.of(
            ConfigurationPropertiesAutoConfiguration.class,
            ValidationAutoConfiguration.class))
        .withUserConfiguration(AccountLockoutProperties.class);

    @Test
    void bindsFromApplicationProperties() {
        contextRunner
            .withPropertyValues(
                "auth.lockout.max-failures-per-window=5",
                "auth.lockout.window-minutes=15",
                "auth.lockout.duration-minutes=15")
            .run(ctx -> {
                AccountLockoutProperties props = ctx.getBean(AccountLockoutProperties.class);
                assertThat(props.maxFailuresPerWindow()).isEqualTo(5);
                assertThat(props.windowMinutes()).isEqualTo(15);
                assertThat(props.durationMinutes()).isEqualTo(15);
            });
    }

    @Test
    void zeroValueRejected() {
        contextRunner
            .withPropertyValues(
                "auth.lockout.max-failures-per-window=0",
                "auth.lockout.window-minutes=15",
                "auth.lockout.duration-minutes=15")
            .run(ctx -> {
                assertThat(ctx).hasFailed();
                assertThat(ctx.getStartupFailure())
                    .rootCause()
                    .hasMessageContaining("maxFailuresPerWindow");
            });
    }
}
