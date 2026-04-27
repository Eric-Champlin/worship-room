package com.worshiproom.friends;

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
 * Validation-error advice scoped to friends controllers.
 *
 * <p><b>Emits {@code INVALID_INPUT}</b> (NOT {@code VALIDATION_FAILED}) to match
 * Spec 2.5.3 acceptance criteria. The friends domain consolidates all 400 errors
 * under {@code INVALID_INPUT}, giving the frontend a single error code to branch
 * on for friends 400s. Field-level errors are still emitted under a {@code fieldErrors}
 * map for parser compatibility with the user-domain response shape.
 *
 * <p>Package-scoped to {@code com.worshiproom.friends} so this advice does NOT
 * compete with sibling validation advices (User, Auth) for {@code MethodArgumentNotValidException}
 * raised from non-friends controllers.
 *
 * <p>Note: {@link com.worshiproom.user.UserController#searchUsers} (Divergence 2)
 * does NOT use {@code @Valid} request bodies — it validates {@code q} length at
 * the service layer, which throws {@link InvalidInputException} (handled by
 * {@link FriendsExceptionHandler}). So this advice is correctly scoped to the
 * friends package even though the search endpoint is cross-package.
 */
@RestControllerAdvice(basePackages = "com.worshiproom.friends")
public class FriendsValidationExceptionHandler {

    private static final Logger log = LoggerFactory.getLogger(FriendsValidationExceptionHandler.class);

    /** @Valid request-body failures (e.g., missing toUserId, invalid action regex). */
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

    /** Missing required query param (e.g., direction= unspecified). */
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
        log.info("friendsValidationFailed fields={}", fieldErrors.keySet());
        Map<String, Object> body = new LinkedHashMap<>();
        body.put("code", "INVALID_INPUT");
        body.put("message", message);
        body.put("requestId", requestId);
        body.put("timestamp", Instant.now().toString());
        body.put("fieldErrors", fieldErrors);
        return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(body);
    }
}
