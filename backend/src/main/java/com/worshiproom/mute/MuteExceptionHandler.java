package com.worshiproom.mute;

import com.worshiproom.proxy.common.ProxyError;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.slf4j.MDC;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

/**
 * Maps {@link MuteException} to {@link ProxyError} HTTP responses.
 *
 * <p>Package-scoped to {@code com.worshiproom.mute} — mute exceptions are only
 * thrown by mute-package code, and package scoping is the safer default per
 * 03-backend-standards.md § "@RestControllerAdvice Scoping". Unlike
 * {@link com.worshiproom.friends.FriendsExceptionHandler}, no cross-package
 * controller throws mute exceptions today.
 */
@RestControllerAdvice(basePackages = "com.worshiproom.mute")
public class MuteExceptionHandler {

    private static final Logger log = LoggerFactory.getLogger(MuteExceptionHandler.class);

    @ExceptionHandler(MuteException.class)
    public ResponseEntity<ProxyError> handleMute(MuteException ex) {
        var requestId = MDC.get("requestId");
        log.info("Mute-domain rejection: code={} message={}", ex.getCode(), ex.getMessage());
        return ResponseEntity
            .status(ex.getStatus())
            .body(ProxyError.of(ex.getCode(), ex.getMessage(), requestId));
    }
}
