package com.worshiproom.verse;

import com.worshiproom.proxy.common.ProxyError;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.slf4j.MDC;
import org.springframework.http.HttpHeaders;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

/**
 * Maps {@link VerseException} subclasses to {@link ProxyError} HTTP responses.
 *
 * <p>Package-scoped to {@code com.worshiproom.verse} per
 * {@code 03-backend-standards.md} § "@RestControllerAdvice Scoping". Filter-raised
 * exceptions don't apply here — Spec 6.8 throws rate-limit exceptions from the
 * service layer (a controller-bound handler), not from a servlet filter, so the
 * package-scoped advice catches them correctly.
 *
 * <p>{@link VerseFindsYouRateLimitException} has the more-specific handler that
 * adds the {@code Retry-After} header. Java's most-specific-handler dispatch
 * picks it first when a {@code VerseFindsYouRateLimitException} is thrown.
 */
@RestControllerAdvice(basePackages = "com.worshiproom.verse")
public class VerseExceptionHandler {

    private static final Logger log = LoggerFactory.getLogger(VerseExceptionHandler.class);

    @ExceptionHandler(VerseFindsYouRateLimitException.class)
    public ResponseEntity<ProxyError> handleRateLimit(VerseFindsYouRateLimitException ex) {
        var requestId = MDC.get("requestId");
        log.info("Verse-Finds-You rate limit hit retryAfter={}s", ex.getRetryAfterSeconds());
        return ResponseEntity
                .status(ex.getStatus())
                .header(HttpHeaders.RETRY_AFTER, String.valueOf(ex.getRetryAfterSeconds()))
                .body(ProxyError.of(ex.getCode(), ex.getMessage(), requestId));
    }

    @ExceptionHandler(VerseException.class)
    public ResponseEntity<ProxyError> handleVerse(VerseException ex) {
        var requestId = MDC.get("requestId");
        log.info("Verse-domain rejection: code={} message={}", ex.getCode(), ex.getMessage());
        return ResponseEntity
                .status(ex.getStatus())
                .body(ProxyError.of(ex.getCode(), ex.getMessage(), requestId));
    }
}
