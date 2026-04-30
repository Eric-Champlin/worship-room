package com.worshiproom.legal;

import com.worshiproom.proxy.common.ProxyError;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.slf4j.MDC;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;

import static org.assertj.core.api.Assertions.assertThat;

class LegalExceptionHandlerTest {

    private final LegalExceptionHandler handler = new LegalExceptionHandler();

    @AfterEach
    void clearMdc() {
        MDC.clear();
    }

    @Test
    void handleVersionMismatchReturns400WithCode() {
        MDC.put("requestId", "req-version-mismatch");

        ResponseEntity<ProxyError> response = handler.handleLegal(new VersionMismatchException());

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);
        assertThat(response.getBody()).isNotNull();
        assertThat(response.getBody().code()).isEqualTo("VERSION_MISMATCH");
        assertThat(response.getBody().message())
            .contains("review and accept the latest versions");
        assertThat(response.getBody().requestId()).isEqualTo("req-version-mismatch");
    }

    @Test
    void handleRateLimitReturns429WithRetryAfter() {
        MDC.put("requestId", "req-rate-limited");

        ResponseEntity<ProxyError> response =
            handler.handleRateLimit(new LegalAcceptanceRateLimitException(60));

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.TOO_MANY_REQUESTS);
        assertThat(response.getHeaders().getFirst(HttpHeaders.RETRY_AFTER)).isEqualTo("60");
        assertThat(response.getBody()).isNotNull();
        assertThat(response.getBody().code()).isEqualTo("RATE_LIMITED");
        assertThat(response.getBody().requestId()).isEqualTo("req-rate-limited");
    }

    @Test
    void handleInvalidVersionReturns400() {
        ResponseEntity<ProxyError> response =
            handler.handleLegal(new InvalidVersionException("bad format"));

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);
        assertThat(response.getBody()).isNotNull();
        assertThat(response.getBody().code()).isEqualTo("INVALID_VERSION");
        assertThat(response.getBody().message()).isEqualTo("bad format");
    }
}
