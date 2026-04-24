package com.worshiproom.user;

import com.worshiproom.proxy.common.ProxyError;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.slf4j.MDC;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

/**
 * Package-scoped advice for {@link UserException}.
 *
 * Scoped to {@code com.worshiproom.user} to prevent this advice from
 * accidentally catching exceptions thrown by sibling controllers (auth,
 * proxy, future feature packages). UserException is controller-raised, so
 * package scoping is safe (unlike AuthException which is filter-raised and
 * requires an unscoped advice — see {@link com.worshiproom.auth.AuthExceptionHandler}'s
 * class JavaDoc for the rationale).
 */
@RestControllerAdvice(basePackages = "com.worshiproom.user")
public class UserExceptionHandler {

    private static final Logger log = LoggerFactory.getLogger(UserExceptionHandler.class);

    @ExceptionHandler(UserException.class)
    public ResponseEntity<ProxyError> handleUser(UserException ex) {
        var requestId = MDC.get("requestId");
        log.info("User-domain rejection: code={} message={}", ex.getCode(), ex.getMessage());
        return ResponseEntity
            .status(ex.getStatus())
            .body(ProxyError.of(ex.getCode(), ex.getMessage(), requestId));
    }
}
