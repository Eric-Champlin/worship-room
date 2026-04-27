package com.worshiproom.friends;

import com.worshiproom.proxy.common.ProxyError;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.slf4j.MDC;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

/**
 * Maps {@link FriendsException} to {@link ProxyError} HTTP responses.
 *
 * <p><b>Deliberately unscoped</b> (no {@code basePackages} filter). Per Spec 2.5.3
 * Divergence 2, the user-search endpoint lives in {@link com.worshiproom.user.UserController}
 * but throws friends-domain exceptions (e.g., {@link InvalidInputException} from
 * {@link FriendsService#searchUsers}). A package-scoped advice keyed to
 * {@code com.worshiproom.friends} would NOT catch exceptions raised from a controller
 * in {@code com.worshiproom.user} — Spring's advice resolution checks the controller's
 * package, not the exception's package.
 *
 * <p>Unscoping is safe here because {@link FriendsException} is owned by the friends
 * domain and is never thrown by any other code. Same architectural shape as
 * {@link com.worshiproom.proxy.common.RateLimitExceptionHandler}, which is also
 * unscoped for the same single-exception-class reason.
 */
@RestControllerAdvice
public class FriendsExceptionHandler {

    private static final Logger log = LoggerFactory.getLogger(FriendsExceptionHandler.class);

    @ExceptionHandler(FriendsException.class)
    public ResponseEntity<ProxyError> handleFriends(FriendsException ex) {
        var requestId = MDC.get("requestId");
        log.info("Friends-domain rejection: code={} message={}", ex.getCode(), ex.getMessage());
        return ResponseEntity
            .status(ex.getStatus())
            .body(ProxyError.of(ex.getCode(), ex.getMessage(), requestId));
    }
}
