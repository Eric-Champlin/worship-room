package com.worshiproom.user;

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
 * Validation-error advice scoped to user controllers. Sibling to
 * {@link com.worshiproom.auth.AuthValidationExceptionHandler}.
 *
 * Emits 400 VALIDATION_FAILED with field-level errors in the response body.
 * Matches the existing AuthValidationExceptionHandler shape so frontend
 * error handling stays uniform across auth and user routes.
 */
@RestControllerAdvice(basePackages = "com.worshiproom.user")
public class UserValidationExceptionHandler {

    private static final Logger log = LoggerFactory.getLogger(UserValidationExceptionHandler.class);

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

        log.info("userValidationFailed fields={}", fieldErrors.keySet());

        Map<String, Object> body = new LinkedHashMap<>();
        body.put("code", "VALIDATION_FAILED");
        body.put("message", "Request validation failed.");
        body.put("requestId", requestId);
        body.put("timestamp", java.time.Instant.now().toString());
        body.put("fieldErrors", fieldErrors);

        return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(body);
    }
}
