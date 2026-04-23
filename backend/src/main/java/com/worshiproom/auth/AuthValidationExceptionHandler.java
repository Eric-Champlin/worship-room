package com.worshiproom.auth;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.slf4j.MDC;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

import java.util.LinkedHashMap;
import java.util.Map;
import java.util.stream.Collectors;

/**
 * Validation-error advice scoped to auth controllers.
 * Parallel to ProxyExceptionHandler — does not overlap (ProxyExceptionHandler
 * is basePackages="com.worshiproom.proxy", this is "com.worshiproom.auth").
 * Emits 400 VALIDATION_FAILED with field-level errors in the response body.
 */
@RestControllerAdvice(basePackages = "com.worshiproom.auth")
public class AuthValidationExceptionHandler {

    private static final Logger log = LoggerFactory.getLogger(AuthValidationExceptionHandler.class);

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<Map<String, Object>> handleValidation(MethodArgumentNotValidException ex) {
        String requestId = MDC.get("requestId");
        Map<String, String> fieldErrors = ex.getBindingResult().getFieldErrors().stream()
            .collect(Collectors.toMap(
                fe -> fe.getField(),
                fe -> fe.getDefaultMessage() == null ? "invalid" : fe.getDefaultMessage(),
                (a, b) -> a,
                LinkedHashMap::new
            ));

        log.info("authValidationFailed fields={}", fieldErrors.keySet());

        Map<String, Object> body = new LinkedHashMap<>();
        body.put("code", "VALIDATION_FAILED");
        body.put("message", "Request validation failed.");
        body.put("requestId", requestId);
        body.put("timestamp", java.time.Instant.now().toString());
        body.put("fieldErrors", fieldErrors);

        return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(body);
    }
}
