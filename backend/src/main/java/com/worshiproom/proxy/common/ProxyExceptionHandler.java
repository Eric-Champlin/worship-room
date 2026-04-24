package com.worshiproom.proxy.common;

import com.worshiproom.proxy.bible.FcbhNotFoundException;
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

@RestControllerAdvice(basePackages = "com.worshiproom.proxy")
public class ProxyExceptionHandler {

    private static final Logger log = LoggerFactory.getLogger(ProxyExceptionHandler.class);

    // Note: RateLimitExceededException is handled by RateLimitExceptionHandler
    // (global advice, no basePackages filter). It's raised from a servlet filter,
    // which means the resolver sees handler=null — and package-scoped advices
    // are skipped when handler=null. See RateLimitExceptionHandler class doc.

    // Explicit branch for FCBH 404s — ordered before the generic ProxyException
    // handler so Spring's dispatcher picks the more specific type. The generic
    // branch would also produce the correct 404 + NOT_FOUND body (FcbhNotFoundException
    // extends ProxyException with status=404, code="NOT_FOUND"), but we want a
    // dedicated INFO-level log line: "audio not available for this chapter" is
    // expected UX behavior, not a warning. See ai-proxy-fcbh.md § AD #5.
    @ExceptionHandler(FcbhNotFoundException.class)
    public ResponseEntity<ProxyError> handleFcbhNotFound(FcbhNotFoundException ex) {
        var requestId = MDC.get("requestId");
        log.info("FCBH not found: {}", ex.getMessage());
        return ResponseEntity
            .status(HttpStatus.NOT_FOUND)
            .body(ProxyError.of("NOT_FOUND", ex.getMessage(), requestId));
    }

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

    // Handles Bean Validation failures on @Validated controllers' @RequestParam
    // and @PathVariable parameters. MethodArgumentNotValidException (above) fires
    // only for @Valid @RequestBody — without this handler, @RequestParam validation
    // would fall through to the Throwable advice and return 500 INTERNAL_ERROR
    // instead of 400 INVALID_INPUT. MapsController's GET /geocode and /place-photo
    // are the first consumers; future proxy GET endpoints inherit this.
    @ExceptionHandler(ConstraintViolationException.class)
    public ResponseEntity<ProxyError> handleConstraintViolation(ConstraintViolationException ex) {
        var requestId = MDC.get("requestId");
        var firstViolation = ex.getConstraintViolations().stream()
            .findFirst()
            .map(v -> {
                String path = v.getPropertyPath().toString();
                String leaf = path.contains(".") ? path.substring(path.lastIndexOf('.') + 1) : path;
                return leaf + ": " + v.getMessage();
            })
            .orElse("Invalid input");
        log.info("Constraint violation: {}", firstViolation);
        return ResponseEntity
            .status(HttpStatus.BAD_REQUEST)
            .body(ProxyError.of("INVALID_INPUT", firstViolation, requestId));
    }

    // Spring Boot 3.2+ / Spring 6.1+ routes @RequestParam / @PathVariable
    // validation through HandlerMethodValidationException instead of the
    // legacy ConstraintViolationException. Without this handler, validation
    // failures on @Validated controllers' GET endpoints fall through to
    // the Throwable advice and return 500. Keep both handlers: legacy code
    // paths still throw ConstraintViolationException directly.
    @ExceptionHandler(HandlerMethodValidationException.class)
    public ResponseEntity<ProxyError> handleHandlerMethodValidation(HandlerMethodValidationException ex) {
        var requestId = MDC.get("requestId");
        var firstError = ex.getParameterValidationResults().stream()
            .flatMap(r -> r.getResolvableErrors().stream().map(err -> {
                String paramName = r.getMethodParameter().getParameterName();
                String code = err.getDefaultMessage();
                return (paramName != null ? paramName : "param") + ": " + code;
            }))
            .findFirst()
            .orElse("Invalid input");
        log.info("Handler-method validation failed: {}", firstError);
        return ResponseEntity
            .status(HttpStatus.BAD_REQUEST)
            .body(ProxyError.of("INVALID_INPUT", firstError, requestId));
    }

    // Missing required @RequestParam produces MissingServletRequestParameterException
    // before validation runs. Map to 400 INVALID_INPUT with the param name.
    @ExceptionHandler(MissingServletRequestParameterException.class)
    public ResponseEntity<ProxyError> handleMissingParam(MissingServletRequestParameterException ex) {
        var requestId = MDC.get("requestId");
        String message = ex.getParameterName() + ": must be provided";
        log.info("Missing request parameter: {}", message);
        return ResponseEntity
            .status(HttpStatus.BAD_REQUEST)
            .body(ProxyError.of("INVALID_INPUT", message, requestId));
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
