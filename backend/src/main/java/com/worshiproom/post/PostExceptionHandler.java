package com.worshiproom.post;

import com.worshiproom.proxy.common.ProxyError;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.slf4j.MDC;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

/**
 * Maps {@link PostException} subclasses to {@link ProxyError} HTTP responses.
 *
 * <p>Package-scoped to {@code com.worshiproom.post} — each domain redeclares
 * its own advice rather than relying on a global one (per
 * {@code 03-backend-standards.md} § "@RestControllerAdvice Scoping").
 */
@RestControllerAdvice(basePackages = "com.worshiproom.post")
public class PostExceptionHandler {

    private static final Logger log = LoggerFactory.getLogger(PostExceptionHandler.class);

    @ExceptionHandler(PostException.class)
    public ResponseEntity<ProxyError> handlePost(PostException ex) {
        var requestId = MDC.get("requestId");
        log.info("Post-domain rejection: code={} message={}", ex.getCode(), ex.getMessage());
        return ResponseEntity
                .status(ex.getStatus())
                .body(ProxyError.of(ex.getCode(), ex.getMessage(), requestId));
    }
}
