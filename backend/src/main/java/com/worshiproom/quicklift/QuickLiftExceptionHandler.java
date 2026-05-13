package com.worshiproom.quicklift;

import com.worshiproom.proxy.common.ProxyError;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.slf4j.MDC;
import org.springframework.http.HttpHeaders;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

/**
 * Package-scoped advice for {@link QuickLiftException} and its rate-limited
 * subclasses (Spec 6.2). Maps each to the project's {@code ProxyError} body and
 * adds {@code Retry-After} for the 429 cases.
 *
 * <p>Scoped to {@code com.worshiproom.quicklift} per Phase 3 Execution Reality
 * Addendum item 6 — Quick Lift exceptions are controller/service-raised (NOT
 * filter-raised), so package scoping is correct here and prevents accidental
 * cross-package catches.
 */
@RestControllerAdvice(basePackages = "com.worshiproom.quicklift")
public class QuickLiftExceptionHandler {

    private static final Logger log = LoggerFactory.getLogger(QuickLiftExceptionHandler.class);

    @ExceptionHandler(QuickLiftStartRateLimitedException.class)
    public ResponseEntity<ProxyError> handleStartRateLimit(QuickLiftStartRateLimitedException ex) {
        var requestId = MDC.get("requestId");
        log.info("Quick Lift start rate-limited: retryAfter={}s", ex.getRetryAfterSeconds());
        return ResponseEntity.status(ex.getStatus())
            .header(HttpHeaders.RETRY_AFTER, String.valueOf(ex.getRetryAfterSeconds()))
            .body(ProxyError.of(ex.getCode(), ex.getMessage(), requestId));
    }

    @ExceptionHandler(QuickLiftCompleteRateLimitedException.class)
    public ResponseEntity<ProxyError> handleCompleteRateLimit(QuickLiftCompleteRateLimitedException ex) {
        var requestId = MDC.get("requestId");
        log.info("Quick Lift complete rate-limited: retryAfter={}s", ex.getRetryAfterSeconds());
        return ResponseEntity.status(ex.getStatus())
            .header(HttpHeaders.RETRY_AFTER, String.valueOf(ex.getRetryAfterSeconds()))
            .body(ProxyError.of(ex.getCode(), ex.getMessage(), requestId));
    }

    @ExceptionHandler(QuickLiftException.class)
    public ResponseEntity<ProxyError> handleQuickLift(QuickLiftException ex) {
        var requestId = MDC.get("requestId");
        log.info("Quick Lift rejected: code={} message={}", ex.getCode(), ex.getMessage());
        return ResponseEntity.status(ex.getStatus())
            .body(ProxyError.of(ex.getCode(), ex.getMessage(), requestId));
    }
}
