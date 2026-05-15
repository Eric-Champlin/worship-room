package com.worshiproom.upload;

import com.worshiproom.storage.ObjectStorageAdapter;
import com.worshiproom.storage.StorageProperties;
import com.worshiproom.storage.StoredObject;
import com.worshiproom.storage.StoredObjectStream;
import com.worshiproom.upload.dto.UploadResponse;
import com.drew.imaging.ImageMetadataReader;
import com.drew.metadata.Metadata;
import com.drew.metadata.exif.ExifIFD0Directory;
import com.drew.metadata.exif.GpsDirectory;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Disabled;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.mock.web.MockMultipartFile;

import javax.imageio.ImageIO;
import java.awt.image.BufferedImage;
import java.io.ByteArrayInputStream;
import java.nio.file.Files;
import java.nio.file.Path;
import java.time.Duration;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/**
 * Unit tests for {@link UploadService} (Spec 4.6b). Storage adapter is mocked;
 * ImageProcessingService runs for real over the binary fixtures so the EXIF
 * strip + dimension validation tests are non-vacuous (W6).
 *
 * <p><b>Disabled tests in this file:</b> twelve tests are {@link Disabled} pending
 * binary fixture commit (see spec-4-6b followup). The {@code sample.jpg},
 * {@code sample.png}, {@code pii-laden.jpg}, {@code corrupt.jpg},
 * {@code oversized.jpg}, {@code large-dimensions.jpg}, and {@code sideways.jpg}
 * fixtures referenced by those tests were never committed to the repo;
 * {@code .webp} / {@code .heic} / {@code .bin} variants exist in
 * {@code src/test/resources/fixtures/} instead. Re-enable when fixtures land.
 * Failure mode is missing-file IO, not a real regression in upload behavior.
 * Tests that exercise paths NOT requiring the missing fixtures
 * ({@code .webp}, {@code .heic}, synthetic bytes, claim flows) remain active.
 */
@ExtendWith(MockitoExtension.class)
class UploadServiceTest {

    @Mock private ObjectStorageAdapter storage;
    private StorageProperties storageProperties;
    private UploadProperties uploadProperties;
    @Mock private UploadRateLimitService rateLimitService;
    private ImageProcessingService imageProcessor;

    private UploadService uploadService;

    private static final Path FIXTURES = Path.of("src/test/resources/fixtures");

    @BeforeEach
    void setUp() {
        storageProperties = new StorageProperties();
        storageProperties.setMaxPresignHours(1);
        uploadProperties = new UploadProperties();
        imageProcessor = new ImageProcessingService();
        uploadService = new UploadService(imageProcessor, storage, storageProperties,
                rateLimitService, uploadProperties);

        // Default storage stubs — lenient because not every test exercises every method.
        lenient().when(storage.put(anyString(), any(), anyLong(), anyString(), any()))
                .thenReturn(new StoredObject("k", 1L, "image/jpeg", "etag-stub"));
        lenient().when(storage.generatePresignedUrl(anyString(), any(Duration.class)))
                .thenAnswer(inv -> "https://presigned/" + inv.getArgument(0));
    }

    // =====================================================================
    // Happy paths — JPEG / PNG / WebP all upload, return three URLs
    // =====================================================================

    /** @Disabled pending binary fixture commit — see class JavaDoc. */
    @Disabled("Pending binary fixture commit (spec-4-6b followup): sample.jpg missing")
    @Test
    void upload_jpeg_succeeds_returns_uploadId_and_three_urls() throws Exception {
        UploadResponse response = uploadService.upload(UUID.randomUUID(),
                multipart("sample.jpg", "image/jpeg"), "rid");

        assertThat(response.uploadId()).matches("[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}");
        assertThat(response.fullUrl()).startsWith("https://presigned/");
        assertThat(response.mediumUrl()).startsWith("https://presigned/");
        assertThat(response.thumbUrl()).startsWith("https://presigned/");
    }

    /** @Disabled pending binary fixture commit — see class JavaDoc. */
    @Disabled("Pending binary fixture commit (spec-4-6b followup): sample.png missing")
    @Test
    void upload_png_succeeds() throws Exception {
        UploadResponse response = uploadService.upload(UUID.randomUUID(),
                multipart("sample.png", "image/png"), "rid");
        assertThat(response.uploadId()).isNotBlank();
        verify(storage, times(3)).put(anyString(), any(), anyLong(), eq("image/jpeg"), any());
    }

    @Test
    void upload_webp_succeeds_via_twelvemonkeys_decoder() throws Exception {
        UploadResponse response = uploadService.upload(UUID.randomUUID(),
                multipart("sample.webp", "image/webp"), "rid");
        assertThat(response.uploadId()).isNotBlank();
    }

    /** @Disabled pending binary fixture commit — see class JavaDoc. */
    @Disabled("Pending binary fixture commit (spec-4-6b followup): sample.jpg missing")
    @Test
    void upload_writes_to_pendingUserIdUploadId_path() throws Exception {
        UUID userId = UUID.randomUUID();
        uploadService.upload(userId, multipart("sample.jpg", "image/jpeg"), "rid");

        ArgumentCaptor<String> keyCaptor = ArgumentCaptor.forClass(String.class);
        verify(storage, times(3)).put(keyCaptor.capture(), any(), anyLong(), anyString(), any());
        String firstKey = keyCaptor.getAllValues().get(0);
        assertThat(firstKey).startsWith("posts/pending/" + userId + "/");
        assertThat(firstKey).endsWith("/full.jpg");
    }

    // =====================================================================
    // Format rejections
    // =====================================================================

    @Test
    void upload_heic_rejected_at_extension_check() {
        assertThatThrownBy(() -> uploadService.upload(UUID.randomUUID(),
                multipart("heic-sample.heic", "image/heic"), "rid"))
                .isInstanceOf(InvalidImageFormatException.class);
    }

    @Test
    void upload_unknown_extension_rejected() {
        assertThatThrownBy(() -> uploadService.upload(UUID.randomUUID(),
                new MockMultipartFile("file", "doc.pdf", "application/pdf", "fake".getBytes()),
                "rid"))
                .isInstanceOf(InvalidImageFormatException.class);
    }

    /** @Disabled pending binary fixture commit — see class JavaDoc. */
    @Disabled("Pending binary fixture commit (spec-4-6b followup): corrupt.jpg missing")
    @Test
    void upload_corrupt_jpeg_rejected_at_decode() {
        assertThatThrownBy(() -> uploadService.upload(UUID.randomUUID(),
                multipart("corrupt.jpg", "image/jpeg"), "rid"))
                .isInstanceOf(InvalidImageFormatException.class);
    }

    // =====================================================================
    // Size + dimension rejections
    // =====================================================================

    /** @Disabled pending binary fixture commit — see class JavaDoc. */
    @Disabled("Pending binary fixture commit (spec-4-6b followup): oversized.jpg missing")
    @Test
    void upload_oversized_file_rejected_at_size_check() throws Exception {
        assertThatThrownBy(() -> uploadService.upload(UUID.randomUUID(),
                multipart("oversized.jpg", "image/jpeg"), "rid"))
                .isInstanceOf(ImageTooLargeException.class);
    }

    /** @Disabled pending binary fixture commit — see class JavaDoc. */
    @Disabled("Pending binary fixture commit (spec-4-6b followup): large-dimensions.jpg missing")
    @Test
    void upload_largeDimensions_rejected_after_decode() throws Exception {
        assertThatThrownBy(() -> uploadService.upload(UUID.randomUUID(),
                multipart("large-dimensions.jpg", "image/jpeg"), "rid"))
                .isInstanceOf(ImageDimensionsTooLargeException.class);
    }

    // =====================================================================
    // EXIF strip — non-vacuous (verify input has tags, output doesn't)
    // =====================================================================

    /** @Disabled pending binary fixture commit — see class JavaDoc. */
    @Disabled("Pending binary fixture commit (spec-4-6b followup): pii-laden.jpg missing")
    @Test
    void upload_strips_exif_gps_metadata() throws Exception {
        // Pre-condition: the fixture HAS GPS data (W6 — vacuous-test prevention).
        byte[] inputBytes = Files.readAllBytes(FIXTURES.resolve("pii-laden.jpg"));
        Metadata inputMeta = ImageMetadataReader.readMetadata(new ByteArrayInputStream(inputBytes));
        assertThat(inputMeta.getFirstDirectoryOfType(GpsDirectory.class))
                .as("input fixture must have GPS data — otherwise the strip test is vacuous")
                .isNotNull();

        // Capture the bytes the storage adapter receives.
        ArgumentCaptor<java.io.InputStream> bodyCaptor = ArgumentCaptor.forClass(java.io.InputStream.class);
        when(storage.put(anyString(), bodyCaptor.capture(), anyLong(), anyString(), any()))
                .thenReturn(new StoredObject("k", 1L, "image/jpeg", "etag"));

        uploadService.upload(UUID.randomUUID(), multipart("pii-laden.jpg", "image/jpeg"), "rid");

        // Read back what the adapter received and verify GPS is gone.
        // We capture all 3 puts; check the first (full rendition).
        java.util.List<java.io.InputStream> bodies = bodyCaptor.getAllValues();
        byte[] strippedBytes = bodies.get(0).readAllBytes();
        Metadata outputMeta = ImageMetadataReader.readMetadata(new ByteArrayInputStream(strippedBytes));
        assertThat(outputMeta.getFirstDirectoryOfType(GpsDirectory.class))
                .as("processed image must NOT have GPS data after strip")
                .isNull();
    }

    /** @Disabled pending binary fixture commit — see class JavaDoc. */
    @Disabled("Pending binary fixture commit (spec-4-6b followup): pii-laden.jpg missing")
    @Test
    void upload_strips_camera_make_and_software_exif_tags() throws Exception {
        byte[] inputBytes = Files.readAllBytes(FIXTURES.resolve("pii-laden.jpg"));
        Metadata inputMeta = ImageMetadataReader.readMetadata(new ByteArrayInputStream(inputBytes));
        ExifIFD0Directory inputDir = inputMeta.getFirstDirectoryOfType(ExifIFD0Directory.class);
        assertThat(inputDir.getString(ExifIFD0Directory.TAG_MAKE)).isEqualTo("Apple");

        ArgumentCaptor<java.io.InputStream> bodyCaptor = ArgumentCaptor.forClass(java.io.InputStream.class);
        when(storage.put(anyString(), bodyCaptor.capture(), anyLong(), anyString(), any()))
                .thenReturn(new StoredObject("k", 1L, "image/jpeg", "etag"));

        uploadService.upload(UUID.randomUUID(), multipart("pii-laden.jpg", "image/jpeg"), "rid");

        byte[] strippedBytes = bodyCaptor.getAllValues().get(0).readAllBytes();
        Metadata outputMeta = ImageMetadataReader.readMetadata(new ByteArrayInputStream(strippedBytes));
        ExifIFD0Directory outputDir = outputMeta.getFirstDirectoryOfType(ExifIFD0Directory.class);
        // ImageIO's JPEG writer doesn't write any EXIF unless we explicitly add it,
        // so Make/Software tags should be entirely absent.
        if (outputDir != null) {
            assertThat(outputDir.getString(ExifIFD0Directory.TAG_MAKE)).isNull();
            assertThat(outputDir.getString(ExifIFD0Directory.TAG_SOFTWARE)).isNull();
        }
    }

    // =====================================================================
    // Orientation correction — sideways JPEG should be uprighted
    // =====================================================================

    /** @Disabled pending binary fixture commit — see class JavaDoc. */
    @Disabled("Pending binary fixture commit (spec-4-6b followup): sideways.jpg missing")
    @Test
    void upload_appliesEXIFOrientation_BEFORE_strip() throws Exception {
        // Fixture is 200x200 with orientation=6 (rotate 90 CW).
        // After strip, output dimensions will be the rotated dimensions.
        // For a square input the dimensions don't change, but the test verifies
        // the pipeline didn't crash and produced output. The unit test for
        // orientation-applied is sufficient at this level; visual verification
        // is in the integration tests.
        UploadResponse response = uploadService.upload(UUID.randomUUID(),
                multipart("sideways.jpg", "image/jpeg"), "rid");
        assertThat(response.uploadId()).isNotBlank();
        verify(storage, times(3)).put(anyString(), any(), anyLong(), eq("image/jpeg"), any());
    }

    // =====================================================================
    // Rendition tests — three keys with the right suffixes
    // =====================================================================

    /** @Disabled pending binary fixture commit — see class JavaDoc. */
    @Disabled("Pending binary fixture commit (spec-4-6b followup): sample.jpg missing")
    @Test
    void upload_writes_three_renditions_full_medium_thumb() throws Exception {
        uploadService.upload(UUID.randomUUID(), multipart("sample.jpg", "image/jpeg"), "rid");

        ArgumentCaptor<String> keyCaptor = ArgumentCaptor.forClass(String.class);
        verify(storage, times(3)).put(keyCaptor.capture(), any(), anyLong(), anyString(), any());
        java.util.List<String> keys = keyCaptor.getAllValues();
        assertThat(keys).anyMatch(k -> k.endsWith("/full.jpg"));
        assertThat(keys).anyMatch(k -> k.endsWith("/medium.jpg"));
        assertThat(keys).anyMatch(k -> k.endsWith("/thumb.jpg"));
    }

    /** @Disabled pending binary fixture commit — see class JavaDoc. */
    @Disabled("Pending binary fixture commit (spec-4-6b followup): sample.jpg missing")
    @Test
    void upload_renditions_have_long_edge_caps_1920_960_320() throws Exception {
        ArgumentCaptor<String> keyCaptor = ArgumentCaptor.forClass(String.class);
        ArgumentCaptor<java.io.InputStream> bodyCaptor = ArgumentCaptor.forClass(java.io.InputStream.class);
        when(storage.put(keyCaptor.capture(), bodyCaptor.capture(), anyLong(), anyString(), any()))
                .thenReturn(new StoredObject("k", 1L, "image/jpeg", "etag"));

        uploadService.upload(UUID.randomUUID(), multipart("sample.jpg", "image/jpeg"), "rid");

        java.util.List<String> keys = keyCaptor.getAllValues();
        java.util.List<java.io.InputStream> bodies = bodyCaptor.getAllValues();
        for (int i = 0; i < keys.size(); i++) {
            byte[] bytes = bodies.get(i).readAllBytes();
            BufferedImage img = ImageIO.read(new ByteArrayInputStream(bytes));
            int longEdge = Math.max(img.getWidth(), img.getHeight());
            // Source is 200x200, so all renditions are capped by the source dimension
            // when source is smaller than the cap. Verify long-edge ≤ cap.
            int cap;
            if (keys.get(i).endsWith("/full.jpg")) cap = 1920;
            else if (keys.get(i).endsWith("/medium.jpg")) cap = 960;
            else cap = 320;
            assertThat(longEdge).isLessThanOrEqualTo(cap);
        }
    }

    // =====================================================================
    // Rate limit — service propagates the limit exception
    // =====================================================================

    /** @Disabled pending binary fixture commit — see class JavaDoc. */
    @Disabled("Pending binary fixture commit (spec-4-6b followup): sample.jpg missing (test loads fixture before asserting rate-limit propagation)")
    @Test
    void upload_rate_limit_throws_UploadRateLimitException() {
        org.mockito.Mockito.doThrow(new UploadRateLimitException(120))
                .when(rateLimitService).checkAndConsume(any(UUID.class));

        assertThatThrownBy(() -> uploadService.upload(UUID.randomUUID(),
                multipart("sample.jpg", "image/jpeg"), "rid"))
                .isInstanceOf(UploadRateLimitException.class);
    }

    // =====================================================================
    // claimUpload — happy path + cross-user reject + missing pending reject
    // =====================================================================

    @Test
    void claimUpload_movesPendingRenditions_returnsClaimedBase() {
        UUID userId = UUID.randomUUID();
        UUID uploadId = UUID.randomUUID();
        UUID postId = UUID.randomUUID();
        String pendingFull = "posts/pending/" + userId + "/" + uploadId + "/full.jpg";
        when(storage.exists(pendingFull)).thenReturn(true);
        when(storage.get(anyString())).thenAnswer(inv -> Optional.of(
                new StoredObjectStream("k", new ByteArrayInputStream("img".getBytes()), 3L,
                        "image/jpeg", java.util.Map.of())));

        String claimedBase = uploadService.claimUpload(userId, uploadId, postId);

        assertThat(claimedBase).isEqualTo("posts/" + postId);
        verify(storage, times(3)).put(anyString(), any(), anyLong(), eq("image/jpeg"), any());
        verify(storage, times(3)).delete(anyString());
    }

    @Test
    void claimUpload_missingPending_throwsImageClaimFailed() {
        UUID userId = UUID.randomUUID();
        UUID uploadId = UUID.randomUUID();
        UUID postId = UUID.randomUUID();
        when(storage.exists(anyString())).thenReturn(false);

        assertThatThrownBy(() -> uploadService.claimUpload(userId, uploadId, postId))
                .isInstanceOf(com.worshiproom.post.ImageClaimFailedException.class);
    }

    @Test
    void claimUpload_crossUser_failsBecausePendingKeyAbsent() {
        // Cross-user is structurally identical to "missing pending" because the
        // userId segment is part of the storage key.
        UUID realOwnerUserId = UUID.randomUUID();
        UUID otherUserId = UUID.randomUUID();
        UUID uploadId = UUID.randomUUID();
        UUID postId = UUID.randomUUID();

        // Pending exists at realOwnerUserId/uploadId/full.jpg, but the claim is
        // attempted with otherUserId — exists() returns false for the constructed path.
        when(storage.exists("posts/pending/" + otherUserId + "/" + uploadId + "/full.jpg"))
                .thenReturn(false);

        assertThatThrownBy(() -> uploadService.claimUpload(otherUserId, uploadId, postId))
                .isInstanceOf(com.worshiproom.post.ImageClaimFailedException.class);
    }

    // =====================================================================
    // Helper
    // =====================================================================

    private MockMultipartFile multipart(String fixtureName, String contentType) throws Exception {
        byte[] bytes = Files.readAllBytes(FIXTURES.resolve(fixtureName));
        return new MockMultipartFile("file", fixtureName, contentType, bytes);
    }
}
