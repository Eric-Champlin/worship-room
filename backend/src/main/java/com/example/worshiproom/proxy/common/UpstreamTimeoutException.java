package com.example.worshiproom.proxy.common;

import org.springframework.http.HttpStatus;

public class UpstreamTimeoutException extends ProxyException {
    public UpstreamTimeoutException(String message) {
        super(HttpStatus.GATEWAY_TIMEOUT, "UPSTREAM_TIMEOUT", message);
    }

    public UpstreamTimeoutException(String message, Throwable cause) {
        super(HttpStatus.GATEWAY_TIMEOUT, "UPSTREAM_TIMEOUT", message, cause);
    }
}
