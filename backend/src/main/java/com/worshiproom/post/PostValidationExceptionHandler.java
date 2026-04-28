package com.worshiproom.post;

import com.worshiproom.proxy.common.ProxyError;
import jakarta.validation.ConstraintViolationException;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.slf4j.MDC;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.MissingServletRequestParameterException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.method.annotation.HandlerMethodValidationException;
import org.springframework.web.method.annotation.MethodArgumentTypeMismatchException;

/**
 * Validation-error advice scoped to post controllers. Emits {@code INVALID_INPUT}
 * (canonical 400 code per {@code backend/docs/api-error-codes.md}).
 *
 * <p>Package-scoped to {@code com.worshiproom.post} so this advice does NOT
 * compete with sibling validation advices in other domains for the same
 * exception types.
 *
 * <p>{@link MethodArgumentTypeMismatchException} is included so a malformed
 * UUID in {@code GET /api/v1/posts/{id}} returns 400 INVALID_INPUT rather
 * than falling through to a 500.
 */
@RestControllerAdvice(basePackages = "com.worshiproom.post")
public class PostValidationExceptionHandler {

    private static final Logger log = LoggerFactory.getLogger(PostValidationExceptionHandler.class);

    @ExceptionHandler({
            MethodArgumentNotValidException.class,
            ConstraintViolationException.class,
            HandlerMethodValidationException.class,
            MissingServletRequestParameterException.class,
            MethodArgumentTypeMismatchException.class
    })
    public ResponseEntity<ProxyError> handleValidation(Exception ex) {
        var requestId = MDC.get("requestId");
        log.info("Post validation error: type={} message={}", ex.getClass().getSimpleName(), ex.getMessage());
        return ResponseEntity
                .status(HttpStatus.BAD_REQUEST)
                .body(ProxyError.of("INVALID_INPUT", "Invalid request parameters", requestId));
    }
}
