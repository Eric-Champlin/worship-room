package com.worshiproom.proxy.common;

import org.springframework.http.HttpStatus;

public class UpstreamException extends ProxyException {
    public UpstreamException(String message) {
        super(HttpStatus.BAD_GATEWAY, "UPSTREAM_ERROR", message);
    }

    public UpstreamException(String message, Throwable cause) {
        super(HttpStatus.BAD_GATEWAY, "UPSTREAM_ERROR", message, cause);
    }
}
