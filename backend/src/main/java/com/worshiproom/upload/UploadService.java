package com.worshiproom.upload;

import com.worshiproom.storage.ObjectStorageAdapter;
import com.worshiproom.storage.StorageProperties;
import com.worshiproom.storage.StoredObjectStream;
import com.worshiproom.upload.dto.UploadResponse;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.ByteArrayInputStream;
import java.io.IOException;
import java.io.InputStream;
import java.time.Duration;
import java.time.Instant;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;

/**
 * Orchestrates the full image upload pipeline (Spec 4.6b):
 *
 * <ol>
 *   <li>Rate-limit check (10/hour per user)</li>
 *   <li>Service-layer size cap (5 MB; Spring's 10 MB multipart cap is the protocol-layer fallback)</li>
 *   <li>Filename-based HEIC reject + allowed-extension check</li>
 *   <li>Read input bytes</li>
 *   <li>Process via {@link ImageProcessingService} (decode + dimension + orientation + resize + strip + re-encode)</li>
 *   <li>Store three renditions at {@code posts/pending/{userId}/{uploadId}/{full,medium,thumb}.jpg}</li>
 *   <li>Return presigned-GET URLs with TTL = {@code STORAGE_MAX_PRESIGN_HOURS}</li>
 * </ol>
 *
 * <p>The {@link #claimUpload(UUID, UUID, UUID)} method is invoked by
 * {@code PostService.createPost} during the image-claim flow. It MOVEs the
 * three renditions from the pending key to the claimed key
 * ({@code posts/{postId}/...}). MOVE = copy + delete, since S3 has no atomic
 * move primitive. Cross-user claim attempts fail naturally because the path
 * includes {@code {userId}} — a different user's pending key is simply absent
 * for the authenticated user.
 *
 * <p>Logging discipline: image bytes never logged. Original filename never
 * logged (may carry PII). Upload IDs and storage keys are safe to log.
 */
@Service
public class UploadService {

    private static final Logger log = LoggerFactory.getLogger(UploadService.class);

    private static final Set<String> ALLOWED_EXTENSIONS = Set.of("jpg", "jpeg", "png", "webp");
    private static final Set<String> HEIC_EXTENSIONS = Set.of("heic", "heif");
    private static final List<String> RENDITIONS = List.of("full.jpg", "medium.jpg", "thumb.jpg");

    private final ImageProcessingService imageProcessor;
    private final ObjectStorageAdapter storage;
    private final StorageProperties storageProperties;
    private final UploadRateLimitService rateLimitService;
    private final UploadProperties config;

    public UploadService(ImageProcessingService imageProcessor,
                         ObjectStorageAdapter storage,
                         StorageProperties storageProperties,
                         UploadRateLimitService rateLimitService,
                         UploadProperties config) {
        this.imageProcessor = imageProcessor;
        this.storage = storage;
        this.storageProperties = storageProperties;
        this.rateLimitService = rateLimitService;
        this.config = config;
    }

    /**
     * Uploads a single image. The full pipeline runs synchronously.
     *
     * @return the uploadId + three presigned-GET URLs
     */
    public UploadResponse upload(UUID userId, MultipartFile file, String requestId) {
        rateLimitService.checkAndConsume(userId);

        if (file.getSize() > config.getMaxSizeBytes()) {
            throw new ImageTooLargeException(file.getSize());
        }

        String extension = extractExtension(file.getOriginalFilename());
        if (HEIC_EXTENSIONS.contains(extension)) {
            throw new InvalidImageFormatException("HEIC images are not supported.");
        }
        if (!ALLOWED_EXTENSIONS.contains(extension)) {
            throw new InvalidImageFormatException("Unsupported file extension.");
        }

        byte[] inputBytes;
        try {
            inputBytes = file.getBytes();
        } catch (IOException e) {
            throw new InvalidImageFormatException("Failed to read uploaded bytes.");
        }

        ImageProcessingService.ProcessedImage processed = imageProcessor.process(inputBytes, file.getContentType());

        UUID uploadId = UUID.randomUUID();
        String pendingBase = String.format("posts/pending/%s/%s",
                userId.toString(), uploadId.toString());
        Map<String, String> metadata = new HashMap<>();
        metadata.put("user-id", userId.toString());
        metadata.put("upload-id", uploadId.toString());
        metadata.put("uploaded-at", Instant.now().toString());

        try {
            storage.put(pendingBase + "/full.jpg", new ByteArrayInputStream(processed.full()),
                    processed.full().length, "image/jpeg", metadata);
            storage.put(pendingBase + "/medium.jpg", new ByteArrayInputStream(processed.medium()),
                    processed.medium().length, "image/jpeg", metadata);
            storage.put(pendingBase + "/thumb.jpg", new ByteArrayInputStream(processed.thumb()),
                    processed.thumb().length, "image/jpeg", metadata);
        } catch (RuntimeException e) {
            log.warn("uploadStorageFailure userId={} uploadId={} requestId={}",
                    userId, uploadId, requestId);
            throw e;
        }

        Duration ttl = Duration.ofHours(storageProperties.getMaxPresignHours());
        String fullUrl = storage.generatePresignedUrl(pendingBase + "/full.jpg", ttl);
        String mediumUrl = storage.generatePresignedUrl(pendingBase + "/medium.jpg", ttl);
        String thumbUrl = storage.generatePresignedUrl(pendingBase + "/thumb.jpg", ttl);

        log.info("uploadCompleted userId={} uploadId={} extension={} sizeBytes={} requestId={}",
                userId, uploadId, extension, file.getSize(), requestId);

        return new UploadResponse(uploadId.toString(), fullUrl, mediumUrl, thumbUrl);
    }

    /**
     * Atomic-ish MOVE of a pending upload into the claimed location for a post.
     * Called from {@code PostService.createPost} inside the @Transactional boundary
     * so a downstream failure rolls back the post insert (storage operations are
     * NOT transactional, but the rare-case orphan is acceptable per spec § 14).
     *
     * <p>Throws {@link com.worshiproom.post.ImageClaimFailedException} for: missing
     * pending key, cross-user claim attempt (different {userId} segment), or
     * storage IO failure.
     *
     * @return the claimed base path (e.g., {@code posts/{postId}}) — caller stores
     *         this in {@code posts.image_url}
     */
    public String claimUpload(UUID userId, UUID uploadId, UUID postId) {
        String pendingBase = String.format("posts/pending/%s/%s", userId.toString(), uploadId.toString());
        String claimedBase = String.format("posts/%s", postId.toString());

        if (!storage.exists(pendingBase + "/full.jpg")) {
            throw new com.worshiproom.post.ImageClaimFailedException();
        }

        for (String rendition : RENDITIONS) {
            String src = pendingBase + "/" + rendition;
            String dst = claimedBase + "/" + rendition;

            Optional<StoredObjectStream> streamOpt = storage.get(src);
            if (streamOpt.isEmpty()) {
                throw new com.worshiproom.post.ImageClaimFailedException();
            }
            byte[] bytes;
            try (StoredObjectStream stream = streamOpt.get();
                 InputStream in = stream.stream()) {
                bytes = in.readAllBytes();
            } catch (IOException e) {
                throw new com.worshiproom.post.ImageClaimFailedException();
            }

            Map<String, String> metadata = Map.of("post-id", postId.toString());
            storage.put(dst, new ByteArrayInputStream(bytes), bytes.length, "image/jpeg", metadata);
        }

        for (String rendition : RENDITIONS) {
            storage.delete(pendingBase + "/" + rendition);
        }

        log.info("uploadClaimed userId={} uploadId={} postId={}", userId, uploadId, postId);

        return claimedBase;
    }

    private String extractExtension(String filename) {
        if (filename == null) return "";
        int dot = filename.lastIndexOf('.');
        return dot < 0 ? "" : filename.substring(dot + 1).toLowerCase();
    }
}
