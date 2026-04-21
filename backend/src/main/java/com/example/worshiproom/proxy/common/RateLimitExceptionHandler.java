package com.example.worshiproom.proxy.common;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.slf4j.MDC;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

/**
 * Global advice for {@link RateLimitExceededException} — unscoped on purpose.
 *
 * {@code RateLimitExceededException} is raised from {@code RateLimitFilter}
 * (a servlet filter, not a controller). Filter-raised exceptions reach an
 * {@link org.springframework.web.servlet.HandlerExceptionResolver} with a
 * {@code null} handler, so package-scoped advices like
 * {@link ProxyExceptionHandler} ({@code basePackages="com.example.worshiproom.proxy"})
 * fail their {@code isApplicableToBeanType(null)} check and are skipped.
 *
 * This advice deliberately has no {@code basePackages} filter so it applies
 * even when no controller handler is associated with the exception. It is
 * safe to be global because it handles exactly one exception type that is
 * only ever thrown by the rate-limit filter.
 */
@RestControllerAdvice
public class RateLimitExceptionHandler {

    private static final Logger log = LoggerFactory.getLogger(RateLimitExceptionHandler.class);

    @ExceptionHandler(RateLimitExceededException.class)
    public ResponseEntity<ProxyError> handleRateLimit(RateLimitExceededException ex) {
        var requestId = MDC.get("requestId");
        log.info("Rate limit exceeded: retryAfter={}s", ex.getRetryAfterSeconds());
        return ResponseEntity
            .status(ex.getStatus())
            .header("Retry-After", String.valueOf(ex.getRetryAfterSeconds()))
            .body(ProxyError.of(ex.getCode(), ex.getMessage(), requestId));
    }
}
