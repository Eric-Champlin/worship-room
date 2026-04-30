package com.worshiproom.legal;

import com.worshiproom.proxy.common.ProxyError;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.slf4j.MDC;
import org.springframework.http.HttpHeaders;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

/**
 * Maps {@link LegalException} subclasses to {@link ProxyError} HTTP responses.
 *
 * <p><b>Intentionally UNSCOPED</b> ({@code @RestControllerAdvice} with no
 * {@code basePackages}). {@link VersionMismatchException} is thrown from BOTH
 * {@link LegalController#acceptVersions} (in {@code com.worshiproom.legal})
 * AND {@link com.worshiproom.auth.AuthService#register} (in
 * {@code com.worshiproom.auth}). A package-scoped advice rooted at
 * {@code com.worshiproom.legal} would silently miss the AuthService case
 * because Spring routes advice by the controller's package, not the
 * exception's package. Same precedent as
 * {@link com.worshiproom.proxy.common.RateLimitExceptionHandler} (unscoped
 * because filter-raised). Safe because the matched exception types are
 * narrow and only thrown intentionally by the legal-acceptance flow.
 *
 * <p>{@link LegalAcceptanceRateLimitException} has a more-specific handler
 * that adds the {@code Retry-After} header. Spring's most-specific-handler
 * dispatch picks it first when a {@code LegalAcceptanceRateLimitException} is
 * thrown.
 */
@RestControllerAdvice
public class LegalExceptionHandler {

    private static final Logger log = LoggerFactory.getLogger(LegalExceptionHandler.class);

    @ExceptionHandler(LegalAcceptanceRateLimitException.class)
    public ResponseEntity<ProxyError> handleRateLimit(LegalAcceptanceRateLimitException ex) {
        var requestId = MDC.get("requestId");
        log.info("Legal accept rate limit hit retryAfter={}s", ex.getRetryAfterSeconds());
        return ResponseEntity
                .status(ex.getStatus())
                .header(HttpHeaders.RETRY_AFTER, String.valueOf(ex.getRetryAfterSeconds()))
                .body(ProxyError.of(ex.getCode(), ex.getMessage(), requestId));
    }

    @ExceptionHandler(LegalException.class)
    public ResponseEntity<ProxyError> handleLegal(LegalException ex) {
        var requestId = MDC.get("requestId");
        log.info("Legal-domain rejection: code={} message={}", ex.getCode(), ex.getMessage());
        return ResponseEntity
                .status(ex.getStatus())
                .body(ProxyError.of(ex.getCode(), ex.getMessage(), requestId));
    }
}
