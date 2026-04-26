package com.worshiproom.activity;

import com.worshiproom.proxy.common.ProxyError;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.slf4j.MDC;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.validation.FieldError;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

import java.time.Instant;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.stream.Collectors;

/**
 * Validation-error advice scoped to activity controllers. Sibling to
 * {@link com.worshiproom.user.UserValidationExceptionHandler} and
 * {@link com.worshiproom.auth.AuthValidationExceptionHandler}.
 *
 * <p>Two handlers:
 * <ul>
 *   <li>{@link MethodArgumentNotValidException} — Bean Validation
 *       failures from {@code @Valid @RequestBody} (e.g., blank
 *       {@code sourceFeature}, null {@code activityType}). Maps to
 *       400 VALIDATION_FAILED with a {@code fieldErrors} map matching
 *       the {@code UserValidationExceptionHandler} shape exactly.</li>
 *   <li>{@link HttpMessageNotReadableException} — Jackson deserialization
 *       failures, most importantly an unknown {@link ActivityType} wire
 *       string ({@code IllegalArgumentException} from
 *       {@link ActivityType#fromWireValue}, wrapped in
 *       {@code JsonMappingException} by Jackson). Maps to 400 INVALID_INPUT
 *       with the standard {@link ProxyError} body.</li>
 * </ul>
 *
 * <p>The error body NEVER includes the underlying exception's message —
 * deserialization failures often echo user-supplied content. Per
 * {@code 02-security.md} § "Never Leak Upstream Error Text" applied
 * defensively to deserialization too.
 */
@RestControllerAdvice(basePackages = "com.worshiproom.activity")
public class ActivityValidationExceptionHandler {

    private static final Logger log =
        LoggerFactory.getLogger(ActivityValidationExceptionHandler.class);

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<Map<String, Object>> handleValidation(
            MethodArgumentNotValidException ex) {
        String requestId = MDC.get("requestId");
        Map<String, String> fieldErrors = ex.getBindingResult().getFieldErrors().stream()
            .collect(Collectors.toMap(
                FieldError::getField,
                fe -> fe.getDefaultMessage() == null ? "invalid" : fe.getDefaultMessage(),
                (a, b) -> a,
                LinkedHashMap::new));

        log.info("activityValidationFailed fields={}", fieldErrors.keySet());

        Map<String, Object> body = new LinkedHashMap<>();
        body.put("code", "VALIDATION_FAILED");
        body.put("message", "Request validation failed.");
        body.put("requestId", requestId);
        body.put("timestamp", Instant.now().toString());
        body.put("fieldErrors", fieldErrors);

        return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(body);
    }

    @ExceptionHandler(HttpMessageNotReadableException.class)
    public ResponseEntity<ProxyError> handleNotReadable(
            HttpMessageNotReadableException ex) {
        String requestId = MDC.get("requestId");
        log.info("activityRequestNotReadable cause={}",
            ex.getMostSpecificCause().getClass().getSimpleName());
        return ResponseEntity.status(HttpStatus.BAD_REQUEST)
            .body(ProxyError.of("INVALID_INPUT",
                "Request body is malformed or contains invalid values.",
                requestId));
    }
}
