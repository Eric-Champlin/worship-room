package com.worshiproom.upload;

import com.worshiproom.auth.AuthenticatedUser;
import com.worshiproom.upload.dto.UploadResponse;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.slf4j.MDC;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.Arrays;
import java.util.Optional;

/**
 * Spec 4.6b — image upload endpoint for testimony / question post composers.
 *
 * <p>Authentication required (SecurityConfig adds an explicit {@code .authenticated()}
 * rule for {@code POST /api/v1/uploads/post-image} above {@code OPTIONAL_AUTH_PATTERNS}).
 *
 * <p>Returns the {@link UploadResponse} payload directly (no nested {@code data}
 * envelope) — same shape convention as {@code PostListResponse} on the post endpoints.
 */
@RestController
@RequestMapping("/api/v1/uploads")
public class UploadController {

    private static final Logger log = LoggerFactory.getLogger(UploadController.class);

    private final UploadService uploadService;
    private final UploadIdempotencyService idempotencyService;

    public UploadController(UploadService uploadService, UploadIdempotencyService idempotencyService) {
        this.uploadService = uploadService;
        this.idempotencyService = idempotencyService;
    }

    @PostMapping(value = "/post-image", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<UploadResponse> uploadPostImage(
            @AuthenticationPrincipal AuthenticatedUser principal,
            @RequestParam("file") MultipartFile file,
            @RequestHeader(name = "Idempotency-Key", required = false) String idempotencyKey) {

        String requestId = MDC.get("requestId");

        int bodyHash = computeBodyHash(file);
        Optional<UploadResponse> cached =
                idempotencyService.lookup(principal.userId(), idempotencyKey, bodyHash);
        if (cached.isPresent()) {
            log.info("uploadIdempotencyHit userId={} requestId={}", principal.userId(), requestId);
            return ResponseEntity.ok(cached.get());
        }

        UploadResponse response = uploadService.upload(principal.userId(), file, requestId);
        idempotencyService.store(principal.userId(), idempotencyKey, bodyHash, response);
        return ResponseEntity.ok(response);
    }

    /**
     * Cheap body hash for multipart idempotency: filesize XOR first 4096 bytes.
     * Avoids hashing 5 MB on every upload while still detecting accidental
     * client retries with the same key but a different file.
     */
    private int computeBodyHash(MultipartFile file) {
        try {
            byte[] head = file.getInputStream().readNBytes(4096);
            return Long.hashCode(file.getSize()) ^ Arrays.hashCode(head);
        } catch (IOException e) {
            return 0;
        }
    }
}
