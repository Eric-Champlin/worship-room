package com.worshiproom.proxy.common;

import org.springframework.http.HttpStatus;

public class ProxyException extends RuntimeException {

    private final HttpStatus status;
    private final String code;

    public ProxyException(HttpStatus status, String code, String message) {
        super(message);
        this.status = status;
        this.code = code;
    }

    public ProxyException(HttpStatus status, String code, String message, Throwable cause) {
        super(message, cause);
        this.status = status;
        this.code = code;
    }

    public HttpStatus getStatus() { return status; }
    public String getCode() { return code; }
}
