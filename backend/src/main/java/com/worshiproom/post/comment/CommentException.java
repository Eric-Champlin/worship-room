package com.worshiproom.post.comment;

import org.springframework.http.HttpStatus;

/**
 * Abstract base for comment-domain exceptions. Subclasses set their own HTTP status
 * and machine-readable error code. Mapped to ProxyError by CommentExceptionHandler.
 *
 * <p>Mirrors {@link com.worshiproom.post.PostException}'s shape but is a separate
 * base type. Keeping the two domain bases distinct prevents Spring's
 * {@code @RestControllerAdvice} dispatch from picking the wrong handler when a
 * Spec 3.5 advice (scoped to {@code com.worshiproom.post}) and the Spec 3.6 advice
 * (scoped to {@code com.worshiproom.post.comment}) are both eligible — without
 * separation, the parent-package advice would match comment controllers via
 * package nesting AND match comment exceptions via type inheritance.
 */
public abstract class CommentException extends RuntimeException {

    private final HttpStatus status;
    private final String code;

    protected CommentException(HttpStatus status, String code, String message) {
        super(message);
        this.status = status;
        this.code = code;
    }

    public HttpStatus getStatus() { return status; }
    public String getCode() { return code; }
}
