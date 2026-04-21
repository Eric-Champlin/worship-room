package com.example.worshiproom.proxy.common;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.slf4j.MDC;
import org.springframework.http.HttpStatus;

import static org.assertj.core.api.Assertions.assertThat;

@DisplayName("ProxyExceptionHandler")
class ProxyExceptionHandlerTest {

    private final ProxyExceptionHandler handler = new ProxyExceptionHandler();

    @Test
    @DisplayName("UpstreamException → 502 BAD_GATEWAY")
    void handlesUpstreamException() {
        MDC.put("requestId", "test-req-id");
        try {
            var response = handler.handleProxyException(new UpstreamException("upstream broke"));
            assertThat(response.getStatusCode()).isEqualTo(HttpStatus.BAD_GATEWAY);
            assertThat(response.getBody().code()).isEqualTo("UPSTREAM_ERROR");
            assertThat(response.getBody().message()).isEqualTo("upstream broke");
        } finally {
            MDC.clear();
        }
    }

    @Test
    @DisplayName("Unknown Throwable → 500 INTERNAL_ERROR with generic message")
    void handlesUnexpected() {
        MDC.put("requestId", "test-req-id");
        try {
            var response = handler.handleUnexpected(new RuntimeException("internal detail"));
            assertThat(response.getStatusCode()).isEqualTo(HttpStatus.INTERNAL_SERVER_ERROR);
            assertThat(response.getBody().code()).isEqualTo("INTERNAL_ERROR");
            assertThat(response.getBody().message()).doesNotContain("internal detail");
        } finally {
            MDC.clear();
        }
    }
}
