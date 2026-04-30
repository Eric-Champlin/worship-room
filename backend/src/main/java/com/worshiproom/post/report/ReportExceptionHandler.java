package com.worshiproom.post.report;

import com.worshiproom.proxy.common.ProxyError;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.slf4j.MDC;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.http.HttpHeaders;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

/**
 * Report-domain exception advice (Spec 3.8). Maps {@link ReportException}
 * subclasses to {@link ProxyError} HTTP responses.
 *
 * <p>Package-scoped to {@code com.worshiproom.post} (NOT
 * {@code com.worshiproom.post.report}) — Spring's {@code basePackages} filter
 * applies to the CONTROLLER's package. Mirrors {@code EngagementExceptionHandler}'s
 * scoping per R4. Type-based dispatch ({@code ReportException} is a distinct
 * base from {@code EngagementException}, {@code PostException}, and
 * {@code CommentException}) keeps domains separate.
 *
 * <p>{@link ReportsRateLimitException} has a dedicated handler that adds the
 * {@code Retry-After} header. Java's most-specific-handler dispatch picks
 * it first when one is thrown.
 */
@RestControllerAdvice(basePackages = "com.worshiproom.post")
@Order(Ordered.HIGHEST_PRECEDENCE)
public class ReportExceptionHandler {

    private static final Logger log = LoggerFactory.getLogger(ReportExceptionHandler.class);

    @ExceptionHandler(ReportsRateLimitException.class)
    public ResponseEntity<ProxyError> handleRateLimit(ReportsRateLimitException ex) {
        var requestId = MDC.get("requestId");
        log.info("Reports rate limit hit retryAfter={}s", ex.getRetryAfterSeconds());
        return ResponseEntity
                .status(ex.getStatus())
                .header(HttpHeaders.RETRY_AFTER, String.valueOf(ex.getRetryAfterSeconds()))
                .body(ProxyError.of(ex.getCode(), ex.getMessage(), requestId));
    }

    @ExceptionHandler(ReportException.class)
    public ResponseEntity<ProxyError> handleReport(ReportException ex) {
        var requestId = MDC.get("requestId");
        log.info("Report-domain rejection: code={} message={}", ex.getCode(), ex.getMessage());
        return ResponseEntity
                .status(ex.getStatus())
                .body(ProxyError.of(ex.getCode(), ex.getMessage(), requestId));
    }
}
