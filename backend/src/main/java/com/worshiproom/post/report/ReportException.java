package com.worshiproom.post.report;

import org.springframework.http.HttpStatus;

/**
 * Abstract base for report-domain exceptions (Spec 3.8). Subclasses set
 * their own HTTP status and machine-readable error code; mapped to
 * {@code ProxyError} responses by {@code ReportExceptionHandler}.
 *
 * <p>Keeping {@code ReportException} as a SEPARATE base type from
 * {@link com.worshiproom.post.engagement.EngagementException},
 * {@link com.worshiproom.post.PostException}, and
 * {@link com.worshiproom.post.comment.CommentException} prevents
 * Spring's {@code @RestControllerAdvice} dispatch from picking the
 * wrong handler when multiple advices live in scope. Type-based
 * dispatch routes only to the correct domain's advice.
 */
public abstract class ReportException extends RuntimeException {

    private final HttpStatus status;
    private final String code;

    protected ReportException(HttpStatus status, String code, String message) {
        super(message);
        this.status = status;
        this.code = code;
    }

    public HttpStatus getStatus() { return status; }
    public String getCode() { return code; }
}
