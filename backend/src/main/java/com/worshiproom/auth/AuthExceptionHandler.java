package com.worshiproom.auth;

import com.worshiproom.proxy.common.ProxyError;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.slf4j.MDC;
import org.springframework.http.HttpHeaders;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

/**
 * Global advice for {@link AuthException} — unscoped on purpose.
 *
 * {@code AuthException} is raised from {@link JwtAuthenticationFilter}
 * (a servlet filter, not a controller). Filter-raised exceptions reach
 * the {@link org.springframework.web.servlet.HandlerExceptionResolver}
 * chain with a {@code null} handler, so package-scoped advices
 * (like {@code ProxyExceptionHandler}) fail their
 * {@code isApplicableToBeanType(null)} check and are skipped.
 *
 * This advice deliberately has no {@code basePackages} filter so it applies
 * even when no controller handler is associated with the exception. It is
 * safe to be global because it handles exactly one exception type that is
 * only ever thrown by the JWT filter.
 *
 * Matches the precedent set by {@code RateLimitExceptionHandler}.
 */
@RestControllerAdvice
public class AuthExceptionHandler {

    private static final Logger log = LoggerFactory.getLogger(AuthExceptionHandler.class);

    @ExceptionHandler(AuthException.class)
    public ResponseEntity<ProxyError> handleAuth(AuthException ex) {
        var requestId = MDC.get("requestId");
        log.info("Auth rejected: code={} message={}", ex.getCode(), ex.getMessage());
        ResponseEntity.BodyBuilder builder = ResponseEntity.status(ex.getStatus());
        if (ex instanceof AccountLockedException locked) {
            builder.header(HttpHeaders.RETRY_AFTER, String.valueOf(locked.getRetryAfterSeconds()));
        }
        return builder.body(ProxyError.of(ex.getCode(), ex.getMessage(), requestId));
    }
}
