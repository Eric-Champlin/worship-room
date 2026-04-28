package com.worshiproom.mute;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.slf4j.MDC;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.MissingServletRequestParameterException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.method.annotation.MethodArgumentTypeMismatchException;

import java.time.Instant;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.stream.Collectors;

/**
 * Validation-error advice scoped to mute controllers. Emits {@code INVALID_INPUT}
 * to match the friends-domain consolidated 400 code (Spec 2.5.3 precedent).
 *
 * <p>Package-scoped to {@code com.worshiproom.mute} so this advice does NOT
 * compete with sibling validation advices for {@code MethodArgumentNotValidException}
 * raised from non-mute controllers.
 */
@RestControllerAdvice(basePackages = "com.worshiproom.mute")
public class MuteValidationExceptionHandler {

    private static final Logger log = LoggerFactory.getLogger(MuteValidationExceptionHandler.class);

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<Map<String, Object>> handleValidation(MethodArgumentNotValidException ex) {
        Map<String, String> fieldErrors = ex.getBindingResult().getFieldErrors().stream()
            .collect(Collectors.toMap(
                fe -> fe.getField(),
                fe -> fe.getDefaultMessage() == null ? "invalid" : fe.getDefaultMessage(),
                (a, b) -> a,
                LinkedHashMap::new
            ));
        return invalidInput("Request validation failed.", fieldErrors);
    }

    @ExceptionHandler(MissingServletRequestParameterException.class)
    public ResponseEntity<Map<String, Object>> handleMissingParam(
            MissingServletRequestParameterException ex) {
        return invalidInput(ex.getParameterName() + " query parameter required",
            Map.of(ex.getParameterName(), "is required"));
    }

    @ExceptionHandler(MethodArgumentTypeMismatchException.class)
    public ResponseEntity<Map<String, Object>> handleTypeMismatch(
            MethodArgumentTypeMismatchException ex) {
        return invalidInput(
            "Invalid value for parameter '" + ex.getName() + "'",
            Map.of(ex.getName(), "must be a valid " +
                (ex.getRequiredType() != null ? ex.getRequiredType().getSimpleName() : "value")));
    }

    private ResponseEntity<Map<String, Object>> invalidInput(
            String message, Map<String, String> fieldErrors) {
        String requestId = MDC.get("requestId");
        log.info("muteValidationFailed fields={}", fieldErrors.keySet());
        Map<String, Object> body = new LinkedHashMap<>();
        body.put("code", "INVALID_INPUT");
        body.put("message", message);
        body.put("requestId", requestId);
        body.put("timestamp", Instant.now().toString());
        body.put("fieldErrors", fieldErrors);
        return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(body);
    }
}
