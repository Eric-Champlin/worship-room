package com.example.worshiproom.proxy.common;

import com.fasterxml.jackson.annotation.JsonInclude;

import java.time.Instant;

@JsonInclude(JsonInclude.Include.NON_NULL)
public record ProxyError(
    String code,
    String message,
    String requestId,
    Instant timestamp
) {
    public static ProxyError of(String code, String message, String requestId) {
        return new ProxyError(code, message, requestId, Instant.now());
    }
}
