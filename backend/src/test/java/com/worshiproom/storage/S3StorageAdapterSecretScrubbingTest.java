package com.worshiproom.storage;

import com.worshiproom.support.TestContainers;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.system.CapturedOutput;
import org.springframework.boot.test.system.OutputCaptureExtension;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;

import java.io.ByteArrayInputStream;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/**
 * Verifies that the configured {@code STORAGE_SECRET_KEY} value never appears in any captured
 * log line during a deliberately failing operation. Per Spec 1.10e acceptance criterion line
 * 2583 — secret leakage is a hard fail and must be caught by an explicit test, not vibes.
 *
 * <p>Triggers a forced failure by pointing the adapter at {@code http://127.0.0.1:1} (a port
 * that no listener will accept) so that the SDK exhausts retries and reports a network
 * failure. The secret key value is then asserted to be absent from both stdout and stderr
 * across the full test execution.
 */
@SpringBootTest
@ActiveProfiles("test")
@ExtendWith(OutputCaptureExtension.class)
class S3StorageAdapterSecretScrubbingTest {

    private static final String SENTINEL_SECRET = "verySecretKeyValue123MustNeverAppearInLogs";

    @DynamicPropertySource
    static void configure(DynamicPropertyRegistry registry) {
        registry.add("worshiproom.storage.endpoint-url", () -> "http://127.0.0.1:1");
        registry.add("worshiproom.storage.region", () -> "us-east-1");
        registry.add("worshiproom.storage.access-key", () -> "fake-access-key");
        registry.add("worshiproom.storage.secret-key", () -> SENTINEL_SECRET);
        registry.add("worshiproom.storage.bucket", () -> "no-bucket");
        registry.add("worshiproom.storage.max-presign-hours", () -> "1");
        registry.add("jwt.secret", () -> "test-jwt-secret-32-chars-minimum-for-hs256-algorithm-xxxxxx");
        TestContainers.registerJdbcProperties(registry);
        registry.add("spring.liquibase.contexts", () -> "test");
        registry.add("spring.datasource.hikari.maximum-pool-size", () -> "3");
        registry.add("spring.datasource.hikari.minimum-idle", () -> "1");
    }

    @Autowired
    private ObjectStorageAdapter adapter;

    @Test
    void failedPut_doesNotLogSecretKey(CapturedOutput output) {
        // Trigger a failure — port 1 is unreachable, the SDK will fail on connection setup.
        byte[] bytes = "hello".getBytes();
        assertThatThrownBy(() ->
                adapter.put(
                        "test-key.txt",
                        new ByteArrayInputStream(bytes),
                        bytes.length,
                        "text/plain",
                        Map.of()))
                .isInstanceOf(Exception.class);

        assertThat(output.getAll())
                .as("STORAGE_SECRET_KEY value must NEVER appear in captured log output")
                .doesNotContain(SENTINEL_SECRET);
    }
}
