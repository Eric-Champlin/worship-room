package com.worshiproom.social;

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
 * Validation-error advice scoped to social controllers. Mirrors
 * {@link com.worshiproom.friends.FriendsValidationExceptionHandler} exactly:
 * emits {@code INVALID_INPUT} (NOT {@code VALIDATION_FAILED}) under a
 * {@code fieldErrors} map, matching the friends-domain shape so the frontend
 * has a single 400-handler shape to branch on.
 *
 * <p>Package-scoped to {@code com.worshiproom.social} so it does NOT compete
 * with sibling validation advices (Friends, User, Auth) for
 * {@code MethodArgumentNotValidException} raised from non-social controllers.
 */
@RestControllerAdvice(basePackages = "com.worshiproom.social")
public class SocialValidationExceptionHandler {

    private static final Logger log = LoggerFactory.getLogger(SocialValidationExceptionHandler.class);

    /** {@code @Valid} request-body failures (e.g., missing {@code toUserId}, message > 200 chars). */
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

    /** Missing required query param. */
    @ExceptionHandler(MissingServletRequestParameterException.class)
    public ResponseEntity<Map<String, Object>> handleMissingParam(
            MissingServletRequestParameterException ex) {
        return invalidInput(ex.getParameterName() + " query parameter required",
            Map.of(ex.getParameterName(), "is required"));
    }

    /** Path-param type mismatch (e.g., {id} not parseable as UUID). */
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
        log.info("socialValidationFailed fields={}", fieldErrors.keySet());
        Map<String, Object> body = new LinkedHashMap<>();
        body.put("code", "INVALID_INPUT");
        body.put("message", message);
        body.put("requestId", requestId);
        body.put("timestamp", Instant.now().toString());
        body.put("fieldErrors", fieldErrors);
        return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(body);
    }
}
