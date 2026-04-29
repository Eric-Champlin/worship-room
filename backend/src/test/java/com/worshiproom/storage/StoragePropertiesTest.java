package com.worshiproom.storage;

import org.junit.jupiter.api.Test;
import org.springframework.boot.autoconfigure.AutoConfigurations;
import org.springframework.boot.autoconfigure.context.ConfigurationPropertiesAutoConfiguration;
import org.springframework.boot.test.context.runner.ApplicationContextRunner;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Verifies that {@link StorageProperties} binds every {@code worshiproom.storage.*} key declared
 * in {@code application.properties} and round-trips the values through the bean's getters.
 *
 * <p>Uses {@link ApplicationContextRunner} (not {@code @SpringBootTest}) for two reasons:
 * <ul>
 *   <li>No PostgreSQL container needed — this is a pure property-binding test.</li>
 *   <li>Mirrors the pattern used by {@code ProductionFailFastTest} in the same package.</li>
 * </ul>
 */
class StoragePropertiesTest {

    private final ApplicationContextRunner contextRunner = new ApplicationContextRunner()
            .withConfiguration(AutoConfigurations.of(ConfigurationPropertiesAutoConfiguration.class))
            .withUserConfiguration(StorageProperties.class);

    @Test
    void bindsAllPropertiesFromConfiguration() {
        contextRunner
                .withPropertyValues(
                        "worshiproom.storage.local-path=/tmp/storage-test",
                        "worshiproom.storage.max-presign-hours=4",
                        "worshiproom.storage.dev-signing-secret=test-dev-signing-secret-32-chars-long-xxxx",
                        "worshiproom.storage.bucket=test-bucket",
                        "worshiproom.storage.region=us-east-1",
                        "worshiproom.storage.access-key=test-access-key",
                        "worshiproom.storage.secret-key=test-secret-key",
                        "worshiproom.storage.endpoint-url=http://localhost:9000")
                .run(ctx -> {
                    StorageProperties props = ctx.getBean(StorageProperties.class);
                    assertThat(props.getLocalPath()).isEqualTo("/tmp/storage-test");
                    assertThat(props.getMaxPresignHours()).isEqualTo(4);
                    assertThat(props.getDevSigningSecret()).isEqualTo("test-dev-signing-secret-32-chars-long-xxxx");
                    assertThat(props.getBucket()).isEqualTo("test-bucket");
                    assertThat(props.getRegion()).isEqualTo("us-east-1");
                    assertThat(props.getAccessKey()).isEqualTo("test-access-key");
                    assertThat(props.getSecretKey()).isEqualTo("test-secret-key");
                    assertThat(props.getEndpointUrl()).isEqualTo("http://localhost:9000");
                });
    }

    @Test
    void appliesDefaults_whenPropertiesAbsent() {
        contextRunner.run(ctx -> {
            StorageProperties props = ctx.getBean(StorageProperties.class);
            assertThat(props.getLocalPath()).isEmpty();
            assertThat(props.getMaxPresignHours()).isEqualTo(1);
            assertThat(props.getDevSigningSecret()).isEmpty();
            assertThat(props.getBucket()).isEmpty();
            assertThat(props.getRegion()).isEmpty();
            assertThat(props.getAccessKey()).isEmpty();
            assertThat(props.getSecretKey()).isEmpty();
            assertThat(props.getEndpointUrl()).isEmpty();
        });
    }
}
