package com.worshiproom.storage;

import com.worshiproom.proxy.common.ProxyError;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.slf4j.MDC;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

/**
 * Maps storage-domain exceptions to {@link ProxyError} HTTP responses.
 *
 * <p>Package-scoped to {@code com.worshiproom.storage} — same pattern as {@link
 * com.worshiproom.post.PostExceptionHandler} per {@code 03-backend-standards.md}
 * § "@RestControllerAdvice Scoping". An unscoped advice would catch IAEs from sibling
 * packages and accidentally reshape responses for unrelated controllers.
 *
 * <p>The {@link IllegalArgumentException} handler is package-scoped: it catches IAEs only
 * from controllers under {@code com.worshiproom.storage} (i.e., {@code DevStorageController}).
 * IAEs thrown from {@code com.worshiproom.post} are caught by that domain's own handler.
 */
@RestControllerAdvice(basePackages = "com.worshiproom.storage")
public class StorageExceptionHandler {

    private static final Logger log = LoggerFactory.getLogger(StorageExceptionHandler.class);

    @ExceptionHandler(ObjectStorageIntegrityException.class)
    public ResponseEntity<ProxyError> handleIntegrity(ObjectStorageIntegrityException ex) {
        String requestId = MDC.get("requestId");
        log.warn("Storage integrity failure: {}", ex.getMessage());
        return ResponseEntity
                .status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(ProxyError.of(
                        "STORAGE_INTEGRITY_FAILURE",
                        "Storage operation failed integrity check.",
                        requestId));
    }

    @ExceptionHandler(IllegalArgumentException.class)
    public ResponseEntity<ProxyError> handleInvalidKey(IllegalArgumentException ex) {
        String requestId = MDC.get("requestId");
        // Log the validation message but never the rejected key value.
        log.info("Storage key validation rejected: {}", ex.getMessage());
        return ResponseEntity
                .status(HttpStatus.BAD_REQUEST)
                .body(ProxyError.of("INVALID_INPUT", ex.getMessage(), requestId));
    }
}
