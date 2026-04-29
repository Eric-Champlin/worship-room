package com.worshiproom.storage;

import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.web.context.WebApplicationContext;

import java.io.ByteArrayInputStream;
import java.nio.file.Path;
import java.time.Instant;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Behavioral tests for {@link com.worshiproom.storage.controller.DevStorageController}:
 * verifies expiry checking, HMAC verification, and round-trip serving of object bytes.
 *
 * <p>Runs under {@code dev} profile so the controller is registered. {@code @TempDir} provides
 * an isolated storage root per test run.
 */
@SpringBootTest
@ActiveProfiles("dev")
class DevStorageControllerSignatureTest {

    private static final String DEV_SIGNING_SECRET = "test-dev-signing-secret-32-chars-long-xxxxxx";

    @TempDir
    static Path tempDir;

    @DynamicPropertySource
    static void configure(DynamicPropertyRegistry registry) {
        registry.add("worshiproom.storage.local-path", () -> tempDir.toString());
        registry.add("worshiproom.storage.dev-signing-secret", () -> DEV_SIGNING_SECRET);
        registry.add("worshiproom.storage.max-presign-hours", () -> "1");
        // Stub backing infrastructure so the dev context boots.
        registry.add("jwt.secret", () -> "dev-jwt-test-secret-32-chars-minimum-for-hs256-algorithm-xxxxxx");
        registry.add("spring.liquibase.enabled", () -> "false");
        registry.add("spring.jpa.hibernate.ddl-auto", () -> "none");
    }

    @Autowired
    private WebApplicationContext webApplicationContext;

    @Autowired
    private ObjectStorageAdapter adapter;

    private MockMvc mockMvc;

    @BeforeEach
    void setUp() {
        mockMvc = MockMvcBuilders.webAppContextSetup(webApplicationContext).build();
    }

    @AfterEach
    void cleanup() {
        // Best-effort cleanup of files written during tests.
        try {
            adapter.list("", 1000).forEach(s -> adapter.delete(s.key()));
        } catch (Exception ignored) {
            // Tempdir cleanup handles the rest.
        }
    }

    @Test
    void rejectsBadSignature() throws Exception {
        String key = "test-bad-signature.txt";
        byte[] bytes = "hello".getBytes();
        adapter.put(key, new ByteArrayInputStream(bytes), bytes.length, "text/plain", Map.of());

        long expires = Instant.now().getEpochSecond() + 60;
        mockMvc.perform(get("/dev-storage/{key}", key)
                        .param("expires", String.valueOf(expires))
                        .param("signature", "tampered-signature"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void rejectsExpired() throws Exception {
        String key = "test-expired.txt";
        byte[] bytes = "hello".getBytes();
        adapter.put(key, new ByteArrayInputStream(bytes), bytes.length, "text/plain", Map.of());

        long expiredAt = Instant.now().getEpochSecond() - 60;
        String signature = com.worshiproom.storage.LocalFilesystemStorageAdapter
                .computeHmac(key, expiredAt, DEV_SIGNING_SECRET);

        mockMvc.perform(get("/dev-storage/{key}", key)
                        .param("expires", String.valueOf(expiredAt))
                        .param("signature", signature))
                .andExpect(status().isGone());
    }

    @Test
    void acceptsValidSignature() throws Exception {
        String key = "test-valid.txt";
        byte[] bytes = "hello world".getBytes();
        adapter.put(key, new ByteArrayInputStream(bytes), bytes.length, "text/plain", Map.of());

        long expires = Instant.now().getEpochSecond() + 60;
        String signature = com.worshiproom.storage.LocalFilesystemStorageAdapter
                .computeHmac(key, expires, DEV_SIGNING_SECRET);

        MvcResult result = mockMvc.perform(get("/dev-storage/{key}", key)
                        .param("expires", String.valueOf(expires))
                        .param("signature", signature))
                .andExpect(status().isOk())
                .andReturn();

        // For StreamingResponseBody, MockMvc requires async dispatch:
        result.getRequest().setAsyncStarted(true);
        MvcResult finalResult = mockMvc.perform(
                org.springframework.test.web.servlet.request.MockMvcRequestBuilders
                        .asyncDispatch(result))
                .andExpect(status().isOk())
                .andReturn();

        byte[] body = finalResult.getResponse().getContentAsByteArray();
        assertThat(body).isEqualTo(bytes);
    }

    @Test
    void notFoundForMissingKey() throws Exception {
        String key = "definitely-does-not-exist.txt";
        long expires = Instant.now().getEpochSecond() + 60;
        String signature = com.worshiproom.storage.LocalFilesystemStorageAdapter
                .computeHmac(key, expires, DEV_SIGNING_SECRET);

        mockMvc.perform(get("/dev-storage/{key}", key)
                        .param("expires", String.valueOf(expires))
                        .param("signature", signature))
                .andExpect(status().isNotFound());
    }
}
