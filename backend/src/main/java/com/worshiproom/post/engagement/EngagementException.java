package com.worshiproom.post.engagement;

import org.springframework.http.HttpStatus;

/**
 * Abstract base for engagement-domain exceptions (Spec 3.7 reactions and
 * bookmarks). Subclasses set their own HTTP status and machine-readable
 * error code. Mapped to ProxyError by EngagementExceptionHandler.
 *
 * <p>Mirrors {@link com.worshiproom.post.PostException} and
 * {@link com.worshiproom.post.comment.CommentException}'s shape but is a
 * separate base type. Keeping the three domain bases distinct prevents
 * Spring's {@code @RestControllerAdvice} dispatch from picking the wrong
 * handler when {@link com.worshiproom.post.PostExceptionHandler} (scoped to
 * {@code com.worshiproom.post}, matches engagement via package nesting),
 * {@link com.worshiproom.post.comment.CommentExceptionHandler} (sibling),
 * and the new {@link EngagementExceptionHandler} are all in scope.
 */
public abstract class EngagementException extends RuntimeException {

    private final HttpStatus status;
    private final String code;

    protected EngagementException(HttpStatus status, String code, String message) {
        super(message);
        this.status = status;
        this.code = code;
    }

    public HttpStatus getStatus() { return status; }
    public String getCode() { return code; }
}
