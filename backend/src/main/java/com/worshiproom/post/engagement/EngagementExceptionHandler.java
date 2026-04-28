package com.worshiproom.post.engagement;

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
 * Engagement-domain exception advice (Spec 3.7). Maps
 * {@link EngagementException} subclasses to {@link ProxyError} HTTP responses.
 *
 * <p>Package-scoped to {@code com.worshiproom.post} (NOT
 * {@code com.worshiproom.post.engagement}). The Spec 3.7 endpoints live on
 * {@link com.worshiproom.post.PostController} — adding 4 endpoints to the
 * existing controller rather than introducing a new EngagementController.
 * Spring's {@code @RestControllerAdvice(basePackages = ...)} filters by the
 * CONTROLLER's package, not by the exception's package, so a tighter scope
 * of {@code com.worshiproom.post.engagement} would silently fail to catch
 * exceptions raised from a {@code com.worshiproom.post}-scoped controller.
 *
 * <p>Dispatch ambiguity is prevented by TYPE, not by package:
 * {@link EngagementException} is a distinct type from
 * {@link com.worshiproom.post.PostException} and
 * {@link com.worshiproom.post.comment.CommentException}, so each advice's
 * {@code @ExceptionHandler} methods route only to their own domain bases.
 * {@code @Order(HIGHEST_PRECEDENCE)} is retained for clarity.
 *
 * <p>{@link ReactionsRateLimitException} and
 * {@link BookmarksRateLimitException} have dedicated handlers that add
 * the {@code Retry-After} header. Java's most-specific-handler dispatch
 * picks them first when one is thrown.
 */
@RestControllerAdvice(basePackages = "com.worshiproom.post")
@Order(Ordered.HIGHEST_PRECEDENCE)
public class EngagementExceptionHandler {

    private static final Logger log = LoggerFactory.getLogger(EngagementExceptionHandler.class);

    @ExceptionHandler(ReactionsRateLimitException.class)
    public ResponseEntity<ProxyError> handleReactionsRateLimit(ReactionsRateLimitException ex) {
        var requestId = MDC.get("requestId");
        log.info("Reactions rate limit hit retryAfter={}s", ex.getRetryAfterSeconds());
        return ResponseEntity
                .status(ex.getStatus())
                .header(HttpHeaders.RETRY_AFTER, String.valueOf(ex.getRetryAfterSeconds()))
                .body(ProxyError.of(ex.getCode(), ex.getMessage(), requestId));
    }

    @ExceptionHandler(BookmarksRateLimitException.class)
    public ResponseEntity<ProxyError> handleBookmarksRateLimit(BookmarksRateLimitException ex) {
        var requestId = MDC.get("requestId");
        log.info("Bookmarks rate limit hit retryAfter={}s", ex.getRetryAfterSeconds());
        return ResponseEntity
                .status(ex.getStatus())
                .header(HttpHeaders.RETRY_AFTER, String.valueOf(ex.getRetryAfterSeconds()))
                .body(ProxyError.of(ex.getCode(), ex.getMessage(), requestId));
    }

    @ExceptionHandler(EngagementException.class)
    public ResponseEntity<ProxyError> handleEngagement(EngagementException ex) {
        var requestId = MDC.get("requestId");
        log.info("Engagement-domain rejection: code={} message={}", ex.getCode(), ex.getMessage());
        return ResponseEntity
                .status(ex.getStatus())
                .body(ProxyError.of(ex.getCode(), ex.getMessage(), requestId));
    }
}
