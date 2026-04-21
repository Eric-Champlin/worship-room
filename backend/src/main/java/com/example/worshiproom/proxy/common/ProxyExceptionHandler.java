package com.example.worshiproom.proxy.common;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.slf4j.MDC;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

@RestControllerAdvice(basePackages = "com.example.worshiproom.proxy")
public class ProxyExceptionHandler {

    private static final Logger log = LoggerFactory.getLogger(ProxyExceptionHandler.class);

    // Note: RateLimitExceededException is handled by RateLimitExceptionHandler
    // (global advice, no basePackages filter). It's raised from a servlet filter,
    // which means the resolver sees handler=null — and package-scoped advices
    // are skipped when handler=null. See RateLimitExceptionHandler class doc.

    @ExceptionHandler(ProxyException.class)
    public ResponseEntity<ProxyError> handleProxyException(ProxyException ex) {
        var requestId = MDC.get("requestId");
        log.warn("Proxy exception: code={} message={}", ex.getCode(), ex.getMessage(), ex);
        return ResponseEntity
            .status(ex.getStatus())
            .body(ProxyError.of(ex.getCode(), ex.getMessage(), requestId));
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<ProxyError> handleValidation(MethodArgumentNotValidException ex) {
        var requestId = MDC.get("requestId");
        var firstError = ex.getBindingResult().getFieldErrors().stream()
            .findFirst()
            .map(e -> e.getField() + ": " + e.getDefaultMessage())
            .orElse("Invalid input");
        log.info("Validation failed: {}", firstError);
        return ResponseEntity
            .status(HttpStatus.BAD_REQUEST)
            .body(ProxyError.of("INVALID_INPUT", firstError, requestId));
    }

    @ExceptionHandler(Throwable.class)
    public ResponseEntity<ProxyError> handleUnexpected(Throwable ex) {
        var requestId = MDC.get("requestId");
        log.error("Unhandled exception in proxy", ex);
        return ResponseEntity
            .status(HttpStatus.INTERNAL_SERVER_ERROR)
            .body(ProxyError.of(
                "INTERNAL_ERROR",
                "An unexpected error occurred. Please try again.",
                requestId
            ));
    }
}
