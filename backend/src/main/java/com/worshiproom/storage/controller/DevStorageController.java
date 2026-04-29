package com.worshiproom.storage.controller;

import com.worshiproom.storage.LocalFilesystemStorageAdapter;
import com.worshiproom.storage.ObjectStorageAdapter;
import com.worshiproom.storage.StorageKeyValidator;
import com.worshiproom.storage.StorageProperties;
import com.worshiproom.storage.StoredObjectStream;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.context.annotation.Profile;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.servlet.mvc.method.annotation.StreamingResponseBody;

import java.io.InputStream;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.time.Instant;
import java.util.Optional;

/**
 * Serves objects stored by {@link LocalFilesystemStorageAdapter} via HMAC-signed URLs. Active
 * under the {@code dev} profile only — production never exposes this endpoint (production
 * consumers fetch directly from R2/S3 via the SDK's presigner output).
 *
 * <p>URL shape: {@code GET /dev-storage/{key}?expires=<unix-seconds>&signature=<base64-url>}
 *
 * <p>Failure modes (fail closed on either):
 * <ul>
 *   <li>410 Gone — {@code expires} is in the past.</li>
 *   <li>401 Unauthorized — {@code signature} does not match HMAC-SHA256 of {@code key:expires}.</li>
 *   <li>404 Not Found — adapter has no object at {@code key}.</li>
 * </ul>
 *
 * <p>{@code @Profile("dev")} ensures the bean is NOT registered under {@code test} or {@code prod},
 * so the URL itself does not exist outside dev.
 */
@RestController
@RequestMapping("/dev-storage")
@Profile("dev")
public class DevStorageController {

    private static final Logger log = LoggerFactory.getLogger(DevStorageController.class);

    private final ObjectStorageAdapter adapter;
    private final StorageProperties properties;

    public DevStorageController(ObjectStorageAdapter adapter, StorageProperties properties) {
        this.adapter = adapter;
        this.properties = properties;
    }

    @GetMapping(value = "/{*key}")
    public ResponseEntity<StreamingResponseBody> serve(
            @PathVariable String key,
            @RequestParam("expires") long expires,
            @RequestParam("signature") String signature) {

        // Spring's {*key} matrix matcher includes a leading slash. Strip it.
        if (key.startsWith("/")) {
            key = key.substring(1);
        }

        // Validate key first — IllegalArgumentException → 400 INVALID_INPUT via StorageExceptionHandler.
        StorageKeyValidator.validate(key);

        // Verify expiry.
        if (Instant.now().getEpochSecond() > expires) {
            log.info("Dev-storage URL expired key={} expires={}", key, expires);
            return ResponseEntity.status(HttpStatus.GONE).build();
        }

        // Verify HMAC (constant-time comparison).
        String expected = LocalFilesystemStorageAdapter.computeHmac(
                key, expires, properties.getDevSigningSecret());
        byte[] expectedBytes = expected.getBytes(StandardCharsets.UTF_8);
        byte[] suppliedBytes = signature.getBytes(StandardCharsets.UTF_8);
        if (!MessageDigest.isEqual(expectedBytes, suppliedBytes)) {
            log.info("Dev-storage signature mismatch key={} expires={}", key, expires);
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }

        Optional<StoredObjectStream> streamOpt = adapter.get(key);
        if (streamOpt.isEmpty()) {
            return ResponseEntity.notFound().build();
        }
        StoredObjectStream stream = streamOpt.get();

        StreamingResponseBody body = out -> {
            try (InputStream in = stream.stream()) {
                in.transferTo(out);
            }
        };

        MediaType mediaType;
        try {
            mediaType = MediaType.parseMediaType(stream.contentType());
        } catch (Exception ex) {
            mediaType = MediaType.APPLICATION_OCTET_STREAM;
        }

        return ResponseEntity.ok()
                .contentType(mediaType)
                .contentLength(stream.sizeBytes())
                .body(body);
    }
}
