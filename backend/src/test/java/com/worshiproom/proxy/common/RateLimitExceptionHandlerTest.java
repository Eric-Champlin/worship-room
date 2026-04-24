package com.worshiproom.proxy.common;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.slf4j.MDC;
import org.springframework.http.HttpStatus;

import static org.assertj.core.api.Assertions.assertThat;

@DisplayName("RateLimitExceptionHandler")
class RateLimitExceptionHandlerTest {

    private final RateLimitExceptionHandler handler = new RateLimitExceptionHandler();

    @Test
    @DisplayName("RateLimitExceededException → 429 with Retry-After header")
    void handlesRateLimit() {
        MDC.put("requestId", "test-req-id");
        try {
            var response = handler.handleRateLimit(new RateLimitExceededException(42));
            assertThat(response.getStatusCode()).isEqualTo(HttpStatus.TOO_MANY_REQUESTS);
            assertThat(response.getHeaders().getFirst("Retry-After")).isEqualTo("42");
            assertThat(response.getBody().code()).isEqualTo("RATE_LIMITED");
            assertThat(response.getBody().requestId()).isEqualTo("test-req-id");
        } finally {
            MDC.clear();
        }
    }
}
