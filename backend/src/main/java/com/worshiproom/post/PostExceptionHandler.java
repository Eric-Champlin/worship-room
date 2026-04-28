package com.worshiproom.post;

import com.worshiproom.proxy.common.ProxyError;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.slf4j.MDC;
import org.springframework.http.HttpHeaders;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

/**
 * Maps {@link PostException} subclasses to {@link ProxyError} HTTP responses.
 *
 * <p>Package-scoped to {@code com.worshiproom.post} — each domain redeclares
 * its own advice rather than relying on a global one (per
 * {@code 03-backend-standards.md} § "@RestControllerAdvice Scoping").
 *
 * <p>{@link PostsRateLimitException} has a more-specific handler that adds the
 * {@code Retry-After} header. Java's most-specific-handler dispatch picks it
 * first when a {@code PostsRateLimitException} is thrown.
 */
@RestControllerAdvice(basePackages = "com.worshiproom.post")
public class PostExceptionHandler {

    private static final Logger log = LoggerFactory.getLogger(PostExceptionHandler.class);

    @ExceptionHandler(PostsRateLimitException.class)
    public ResponseEntity<ProxyError> handleRateLimit(PostsRateLimitException ex) {
        var requestId = MDC.get("requestId");
        log.info("Posts rate limit hit retryAfter={}s", ex.getRetryAfterSeconds());
        return ResponseEntity
                .status(ex.getStatus())
                .header(HttpHeaders.RETRY_AFTER, String.valueOf(ex.getRetryAfterSeconds()))
                .body(ProxyError.of(ex.getCode(), ex.getMessage(), requestId));
    }

    @ExceptionHandler(PostException.class)
    public ResponseEntity<ProxyError> handlePost(PostException ex) {
        var requestId = MDC.get("requestId");
        log.info("Post-domain rejection: code={} message={}", ex.getCode(), ex.getMessage());
        return ResponseEntity
                .status(ex.getStatus())
                .body(ProxyError.of(ex.getCode(), ex.getMessage(), requestId));
    }
}
