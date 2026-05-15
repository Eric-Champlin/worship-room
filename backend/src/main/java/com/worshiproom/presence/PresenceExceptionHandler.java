package com.worshiproom.presence;

import com.worshiproom.proxy.common.ProxyError;
import org.slf4j.MDC;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

/**
 * Spec 6.11b — package-scoped exception handler for the presence package.
 * Per Phase 3 Addendum item 6: domain-scoped advice via
 * {@code basePackages = "com.worshiproom.presence"}.
 *
 * <p>Currently handles only {@link PresenceRateLimitException}. The advice is
 * NOT registered for filter-raised exceptions (none in this package).
 */
@RestControllerAdvice(basePackages = "com.worshiproom.presence")
public class PresenceExceptionHandler {

    @ExceptionHandler(PresenceRateLimitException.class)
    public ResponseEntity<ProxyError> handleRateLimit(PresenceRateLimitException ex) {
        return ResponseEntity.status(429)
            .header("Retry-After", String.valueOf(ex.getRetryAfterSeconds()))
            .body(ProxyError.of("RATE_LIMITED",
                "Too many presence checks. Please wait and try again.",
                MDC.get("requestId")));
    }
}
