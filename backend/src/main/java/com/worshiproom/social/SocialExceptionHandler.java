package com.worshiproom.social;

import com.worshiproom.proxy.common.ProxyError;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.slf4j.MDC;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

/**
 * Maps {@link SocialException} subclasses to {@link ProxyError} HTTP responses.
 *
 * <p>Package-scoped to {@code com.worshiproom.social}. Friends-domain exceptions
 * thrown from {@link SocialController} / {@link SocialInteractionsService}
 * (cross-package re-uses of {@code SelfActionException}, {@code UserNotFoundException},
 * {@code InvalidInputException}) are caught by the deliberately-unscoped
 * {@link com.worshiproom.friends.FriendsExceptionHandler}.
 */
@RestControllerAdvice(basePackages = "com.worshiproom.social")
public class SocialExceptionHandler {

    private static final Logger log = LoggerFactory.getLogger(SocialExceptionHandler.class);

    @ExceptionHandler(SocialException.class)
    public ResponseEntity<ProxyError> handleSocial(SocialException ex) {
        var requestId = MDC.get("requestId");
        log.info("Social-domain rejection: code={} message={}", ex.getCode(), ex.getMessage());
        return ResponseEntity
            .status(ex.getStatus())
            .body(ProxyError.of(ex.getCode(), ex.getMessage(), requestId));
    }
}
