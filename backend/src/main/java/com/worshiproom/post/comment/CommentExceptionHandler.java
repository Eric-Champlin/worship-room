package com.worshiproom.post.comment;

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
 * Comment-domain exception advice. Maps {@link CommentException} subclasses to
 * {@link ProxyError} HTTP responses.
 *
 * <p>Package-scoped to {@code com.worshiproom.post.comment} so this advice
 * matches comment controllers ONLY. {@code @Order(HIGHEST_PRECEDENCE)} ensures
 * this advice wins dispatch over the sibling {@code PostExceptionHandler}
 * (which matches {@code com.worshiproom.post} including sub-packages by package
 * nesting) when both are eligible — though in practice the comment-domain
 * exceptions extend {@link CommentException} (not {@code PostException}), so
 * type-matching keeps the two advices separate.
 *
 * <p>{@link CommentsRateLimitException} has a more-specific handler that adds the
 * {@code Retry-After} header. Java's most-specific-handler dispatch picks it
 * first when a {@code CommentsRateLimitException} is thrown.
 */
@RestControllerAdvice(basePackages = "com.worshiproom.post.comment")
@Order(Ordered.HIGHEST_PRECEDENCE)
public class CommentExceptionHandler {

    private static final Logger log = LoggerFactory.getLogger(CommentExceptionHandler.class);

    @ExceptionHandler(CommentsRateLimitException.class)
    public ResponseEntity<ProxyError> handleRateLimit(CommentsRateLimitException ex) {
        var requestId = MDC.get("requestId");
        log.info("Comments rate limit hit retryAfter={}s", ex.getRetryAfterSeconds());
        return ResponseEntity
                .status(ex.getStatus())
                .header(HttpHeaders.RETRY_AFTER, String.valueOf(ex.getRetryAfterSeconds()))
                .body(ProxyError.of(ex.getCode(), ex.getMessage(), requestId));
    }

    @ExceptionHandler(CommentException.class)
    public ResponseEntity<ProxyError> handleComment(CommentException ex) {
        var requestId = MDC.get("requestId");
        log.info("Comment-domain rejection: code={} message={}", ex.getCode(), ex.getMessage());
        return ResponseEntity
                .status(ex.getStatus())
                .body(ProxyError.of(ex.getCode(), ex.getMessage(), requestId));
    }

    // PostCommentNotFoundException extends PostException and is handled by
    // PostExceptionHandler.handlePost (404 + code COMMENT_NOT_FOUND). No explicit
    // handler here — letting it fall through to the broader-scoped advice keeps
    // the existing Spec 3.4 read-side error code stable across read and write paths.
}
