package com.worshiproom.upload;

import com.worshiproom.proxy.common.ProxyError;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.slf4j.MDC;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.multipart.MaxUploadSizeExceededException;

/**
 * Maps {@link UploadException} subclasses to {@link ProxyError} HTTP responses
 * (Spec 4.6b).
 *
 * <p>Package-scoped to {@code com.worshiproom.upload} — each domain redeclares
 * its own advice rather than relying on a global one (per
 * {@code 03-backend-standards.md} § "@RestControllerAdvice Scoping").
 *
 * <p>Filter-raised gotcha note: {@link MaxUploadSizeExceededException} is
 * raised by Spring's {@code MultipartResolver} BEFORE the controller is
 * matched, but Spring resolves the controller class first to determine the
 * advice scope, so this package-scoped advice DOES catch it for upload requests.
 * If a future change causes the controller to be unmatched at exception time,
 * fall back to an unscoped companion advice for {@code MaxUploadSizeExceededException}
 * (the canonical pattern for genuinely filter-raised exceptions).
 */
@RestControllerAdvice(basePackages = "com.worshiproom.upload")
public class UploadExceptionHandler {

    private static final Logger log = LoggerFactory.getLogger(UploadExceptionHandler.class);

    @ExceptionHandler(UploadRateLimitException.class)
    public ResponseEntity<ProxyError> handleRateLimit(UploadRateLimitException ex) {
        var requestId = MDC.get("requestId");
        log.info("Upload rate limit hit retryAfter={}s", ex.getRetryAfterSeconds());
        return ResponseEntity
                .status(ex.getStatus())
                .header(HttpHeaders.RETRY_AFTER, String.valueOf(ex.getRetryAfterSeconds()))
                .body(ProxyError.of(ex.getCode(), ex.getMessage(), requestId));
    }

    @ExceptionHandler(InvalidImageFormatException.class)
    public ResponseEntity<ProxyError> handleInvalidFormat(InvalidImageFormatException ex) {
        var requestId = MDC.get("requestId");
        // Surface the server-side diagnostic detail (HEIC vs corrupt vs decode-fail)
        // so logs correlate to the cause without leaking it to the client.
        log.info("Upload format rejection detail={} requestId={}", ex.getDetail(), requestId);
        return ResponseEntity
                .status(ex.getStatus())
                .body(ProxyError.of(ex.getCode(), ex.getMessage(), requestId));
    }

    @ExceptionHandler(UploadException.class)
    public ResponseEntity<ProxyError> handleUpload(UploadException ex) {
        var requestId = MDC.get("requestId");
        log.info("Upload-domain rejection: code={} message={}", ex.getCode(), ex.getMessage());
        return ResponseEntity
                .status(ex.getStatus())
                .body(ProxyError.of(ex.getCode(), ex.getMessage(), requestId));
    }

    @ExceptionHandler(MaxUploadSizeExceededException.class)
    public ResponseEntity<ProxyError> handleMaxUploadSize(MaxUploadSizeExceededException ex) {
        var requestId = MDC.get("requestId");
        log.info("Upload exceeded Spring multipart cap requestId={}", requestId);
        return ResponseEntity
                .status(HttpStatus.PAYLOAD_TOO_LARGE)
                .body(ProxyError.of("PAYLOAD_TOO_LARGE",
                        "Image is larger than 10 MB. Try a much smaller version.",
                        requestId));
    }
}
