package com.worshiproom.storage;

import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.MethodOrderer;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.TestMethodOrder;

import java.io.ByteArrayInputStream;
import java.io.IOException;
import java.io.InputStream;
import java.time.Duration;
import java.time.Instant;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/**
 * Behavioral contract that BOTH {@link LocalFilesystemStorageAdapter} and
 * {@link S3StorageAdapter} (against MinIO) MUST satisfy. This class is the load-bearing
 * artifact of Spec 1.10e — the single source of truth for adapter parity.
 *
 * <p>Subclasses provide:
 * <ul>
 *   <li>{@link #adapter()} — the {@link ObjectStorageAdapter} under test.</li>
 *   <li>{@link #extractExpiresFromUrl(String)} — adapter-specific URL parsing
 *       (LocalFilesystem uses {@code expires=}, S3 uses {@code X-Amz-Date} +
 *       {@code X-Amz-Expires}).</li>
 *   <li>{@link #maxPresignHours()} — the cap configured for the adapter under test.</li>
 * </ul>
 *
 * <p>Tests independently track keys they create and clean up in {@link #cleanupCreatedKeys()}.
 */
@TestMethodOrder(MethodOrderer.OrderAnnotation.class)
abstract class AbstractObjectStorageContractTest {

    protected abstract ObjectStorageAdapter adapter();

    /**
     * Parse the absolute Unix-seconds expiry timestamp out of the adapter's presigned URL.
     * Each adapter encodes expiry differently.
     */
    protected abstract long extractExpiresFromUrl(String url);

    /** Max presign hours configured for the adapter under test (used by the cap test). */
    protected long maxPresignHours() {
        return 1L;
    }

    private final Set<String> createdKeys = new HashSet<>();

    @AfterEach
    void cleanupCreatedKeys() {
        for (String key : createdKeys) {
            try {
                adapter().delete(key);
            } catch (Exception ignored) {
                // Best-effort.
            }
        }
        createdKeys.clear();
    }

    private String trackKey(String suffix) {
        String key = "contract-test/" + UUID.randomUUID() + "/" + suffix;
        createdKeys.add(key);
        return key;
    }

    private byte[] loadFixture(String fixtureName) throws IOException {
        try (InputStream in = getClass().getResourceAsStream("/fixtures/" + fixtureName)) {
            assertThat(in).as("fixture %s must exist on classpath", fixtureName).isNotNull();
            return in.readAllBytes();
        }
    }

    // -- Tests -----------------------------------------------------------------------------

    @Test
    void putAndGet_smallFile_roundTripsBytes() throws IOException {
        byte[] bytes = loadFixture("contract-small.bin");
        String key = trackKey("small.bin");
        adapter().put(key, new ByteArrayInputStream(bytes), bytes.length, "application/octet-stream", Map.of());

        try (StoredObjectStream stream = adapter().get(key).orElseThrow();
             InputStream body = stream.stream()) {
            byte[] retrieved = body.readAllBytes();
            assertThat(retrieved).isEqualTo(bytes);
            assertThat(stream.sizeBytes()).isEqualTo(bytes.length);
        }
    }

    @Test
    void putAndGet_mediumFile_roundTripsBytes() throws IOException {
        byte[] bytes = loadFixture("contract-medium.bin");
        String key = trackKey("medium.bin");
        adapter().put(key, new ByteArrayInputStream(bytes), bytes.length, "application/octet-stream", Map.of());

        try (StoredObjectStream stream = adapter().get(key).orElseThrow();
             InputStream body = stream.stream()) {
            byte[] retrieved = body.readAllBytes();
            assertThat(retrieved).isEqualTo(bytes);
        }
    }

    @Test
    void putAndGet_largeFile_roundTripsBytes() throws IOException {
        byte[] bytes = loadFixture("contract-large.bin");
        String key = trackKey("large.bin");
        adapter().put(key, new ByteArrayInputStream(bytes), bytes.length, "application/octet-stream", Map.of());

        try (StoredObjectStream stream = adapter().get(key).orElseThrow();
             InputStream body = stream.stream()) {
            byte[] retrieved = body.readAllBytes();
            assertThat(retrieved).hasSize(bytes.length);
            assertThat(retrieved).isEqualTo(bytes);
        }
    }

    @Test
    void put_contentLengthMismatch_throwsIntegrityException() {
        String key = trackKey("mismatch.bin");
        byte[] bytes = "hello".getBytes(); // 5 bytes
        assertThatThrownBy(() ->
                adapter().put(key, new ByteArrayInputStream(bytes), 100L, "text/plain", Map.of()))
                .isInstanceOf(ObjectStorageIntegrityException.class)
                .hasMessageContaining("contentLength");
    }

    @Test
    void put_streamLongerThanDeclared_throwsIntegrityException() {
        // Inverse of the mismatch test: declared length is shorter than the actual stream.
        // Both adapters must detect this without unbounded allocation (S3 via readNBytes cap;
        // LocalFilesystem via early-exit on overrun in the streaming write loop).
        String key = trackKey("longer-than-declared.bin");
        byte[] bytes = "hello world this is way more than five bytes".getBytes();
        assertThatThrownBy(() ->
                adapter().put(key, new ByteArrayInputStream(bytes), 5L, "text/plain", Map.of()))
                .isInstanceOf(ObjectStorageIntegrityException.class)
                .hasMessageContaining("contentLength");
    }

    @Test
    void put_nullContentType_normalizesToOctetStream() {
        // Adapter parity: a null contentType on put() must surface as
        // "application/octet-stream" on the matching get(). LocalFilesystem fills the sidecar
        // default; S3 normalizes at the put() boundary so the SDK sends an explicit
        // Content-Type rather than letting the provider default differ.
        String key = trackKey("null-content-type.bin");
        byte[] bytes = "x".getBytes();
        adapter().put(key, new ByteArrayInputStream(bytes), bytes.length, null, Map.of());

        try (StoredObjectStream stream = adapter().get(key).orElseThrow()) {
            assertThat(stream.contentType()).isEqualTo("application/octet-stream");
        } catch (IOException e) {
            throw new RuntimeException(e);
        }
    }

    @Test
    void put_preservesContentType() {
        String key = trackKey("typed.bin");
        byte[] bytes = "image-bytes".getBytes();
        adapter().put(key, new ByteArrayInputStream(bytes), bytes.length, "image/png", Map.of());

        try (StoredObjectStream stream = adapter().get(key).orElseThrow()) {
            assertThat(stream.contentType()).isEqualTo("image/png");
        } catch (IOException e) {
            throw new RuntimeException(e);
        }
    }

    @Test
    void put_preservesMetadata() {
        String key = trackKey("metadata.bin");
        byte[] bytes = "with-metadata".getBytes();
        adapter().put(key, new ByteArrayInputStream(bytes), bytes.length, "text/plain",
                Map.of("user-id", "abc-123", "category", "test"));

        try (StoredObjectStream stream = adapter().get(key).orElseThrow()) {
            assertThat(stream.metadata())
                    .containsEntry("user-id", "abc-123")
                    .containsEntry("category", "test");
        } catch (IOException e) {
            throw new RuntimeException(e);
        }
    }

    @Test
    void exists_afterPut_returnsTrue() {
        String key = trackKey("exists-yes.bin");
        byte[] bytes = "x".getBytes();
        adapter().put(key, new ByteArrayInputStream(bytes), bytes.length, "text/plain", Map.of());
        assertThat(adapter().exists(key)).isTrue();
    }

    @Test
    void exists_neverPut_returnsFalse() {
        String key = "contract-test/" + UUID.randomUUID() + "/never-put.bin";
        assertThat(adapter().exists(key)).isFalse();
    }

    @Test
    void delete_existing_returnsTrue() {
        String key = trackKey("to-delete.bin");
        byte[] bytes = "delete-me".getBytes();
        adapter().put(key, new ByteArrayInputStream(bytes), bytes.length, "text/plain", Map.of());

        assertThat(adapter().delete(key)).isTrue();
        assertThat(adapter().exists(key)).isFalse();
        // Idempotent: a second delete returns false.
        assertThat(adapter().delete(key)).isFalse();
        // No need to track for cleanup since we deleted.
        createdKeys.remove(key);
    }

    @Test
    void delete_nonExisting_returnsFalse() {
        String key = "contract-test/" + UUID.randomUUID() + "/never-existed.bin";
        assertThat(adapter().delete(key)).isFalse();
    }

    @Test
    void list_byPrefix_returnsMatchingKeys() {
        String runId = UUID.randomUUID().toString();
        String prefixA = "contract-test/" + runId + "/prefix-a/";
        String prefixB = "contract-test/" + runId + "/prefix-b/";
        for (int i = 0; i < 3; i++) {
            String k = prefixA + "file-" + i + ".bin";
            createdKeys.add(k);
            byte[] bytes = ("a-" + i).getBytes();
            adapter().put(k, new ByteArrayInputStream(bytes), bytes.length, "text/plain", Map.of());
        }
        for (int i = 0; i < 2; i++) {
            String k = prefixB + "file-" + i + ".bin";
            createdKeys.add(k);
            byte[] bytes = ("b-" + i).getBytes();
            adapter().put(k, new ByteArrayInputStream(bytes), bytes.length, "text/plain", Map.of());
        }

        List<StoredObjectSummary> matches = adapter().list(prefixA, 10);
        assertThat(matches).hasSize(3);
        assertThat(matches).extracting(StoredObjectSummary::key)
                .allSatisfy(k -> assertThat(k).startsWith(prefixA))
                .isSorted();
    }

    @Test
    void list_respectsMaxResults() {
        String runId = UUID.randomUUID().toString();
        String prefix = "contract-test/" + runId + "/limit/";
        for (int i = 0; i < 5; i++) {
            String k = prefix + "file-" + i + ".bin";
            createdKeys.add(k);
            byte[] bytes = ("v-" + i).getBytes();
            adapter().put(k, new ByteArrayInputStream(bytes), bytes.length, "text/plain", Map.of());
        }

        List<StoredObjectSummary> result = adapter().list(prefix, 3);
        assertThat(result).hasSize(3);
    }

    @Test
    void generatePresignedUrl_returnsNonEmptyUrl() {
        String key = trackKey("presigned.bin");
        byte[] bytes = "x".getBytes();
        adapter().put(key, new ByteArrayInputStream(bytes), bytes.length, "text/plain", Map.of());

        String url = adapter().generatePresignedUrl(key, Duration.ofMinutes(5));
        assertThat(url).isNotEmpty();
        assertThat(url).startsWith("http");
    }

    @Test
    void generatePresignedUrl_capsAtMaxPresignHours() {
        String key = trackKey("cap.bin");
        byte[] bytes = "x".getBytes();
        adapter().put(key, new ByteArrayInputStream(bytes), bytes.length, "text/plain", Map.of());

        // Request 7 days; expect cap at maxPresignHours.
        String url = adapter().generatePresignedUrl(key, Duration.ofDays(7));
        long expiresEpoch = extractExpiresFromUrl(url);

        long maxAllowed = Instant.now().getEpochSecond() + Duration.ofHours(maxPresignHours()).getSeconds();
        // Tolerance: 5 seconds for test execution latency.
        assertThat(expiresEpoch).isLessThanOrEqualTo(maxAllowed + 5);
    }

    @Test
    void generatePresignedUrl_negativeExpiry_throwsIAE() {
        String key = trackKey("neg.bin");
        byte[] bytes = "x".getBytes();
        adapter().put(key, new ByteArrayInputStream(bytes), bytes.length, "text/plain", Map.of());

        assertThatThrownBy(() -> adapter().generatePresignedUrl(key, Duration.ofMillis(-100)))
                .isInstanceOf(IllegalArgumentException.class);
    }

    @Test
    void key_withDoubleDot_throwsIAE() {
        assertThatThrownBy(() -> adapter().put(
                "../foo",
                new ByteArrayInputStream("x".getBytes()),
                1L,
                "text/plain",
                Map.of()))
                .isInstanceOf(IllegalArgumentException.class);
    }

    @Test
    void key_exceedsMaxLength_throwsIAE() {
        String tooLong = "a".repeat(257);
        assertThatThrownBy(() -> adapter().put(
                tooLong,
                new ByteArrayInputStream("x".getBytes()),
                1L,
                "text/plain",
                Map.of()))
                .isInstanceOf(IllegalArgumentException.class);
    }

    @Test
    void key_uppercase_throwsIAE() {
        assertThatThrownBy(() -> adapter().put(
                "Foo.txt",
                new ByteArrayInputStream("x".getBytes()),
                1L,
                "text/plain",
                Map.of()))
                .isInstanceOf(IllegalArgumentException.class);
    }

    @Test
    void get_missingKey_returnsEmpty() {
        Optional<StoredObjectStream> result = adapter().get(
                "contract-test/" + UUID.randomUUID() + "/nonexistent.bin");
        assertThat(result).isEmpty();
    }
}
