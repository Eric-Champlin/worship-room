package com.worshiproom.proxy.common;

import jakarta.validation.ConstraintViolation;
import jakarta.validation.ConstraintViolationException;
import jakarta.validation.Path;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.slf4j.MDC;
import org.springframework.http.HttpStatus;

import java.util.Set;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

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

    @Test
    @DisplayName("ConstraintViolationException → 400 INVALID_INPUT with leaf field name")
    void handlesConstraintViolation() {
        MDC.put("requestId", "test-req-id");
        try {
            // Build a ConstraintViolation manually. A real one would come from
            // @Validated + @RequestParam @NotBlank violations, but the handler's
            // input surface is just the violations set — we construct one with
            // a dotted path to verify leaf extraction.
            ConstraintViolation<?> violation = mock(ConstraintViolation.class);
            Path path = mock(Path.class);
            when(path.toString()).thenReturn("geocode.query");
            when(violation.getPropertyPath()).thenReturn(path);
            when(violation.getMessage()).thenReturn("must not be blank");

            var ex = new ConstraintViolationException("geocode.query: must not be blank", Set.of(violation));

            var response = handler.handleConstraintViolation(ex);
            assertThat(response.getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);
            assertThat(response.getBody().code()).isEqualTo("INVALID_INPUT");
            assertThat(response.getBody().message()).isEqualTo("query: must not be blank");
            assertThat(response.getBody().requestId()).isEqualTo("test-req-id");
        } finally {
            MDC.clear();
        }
    }

    @Test
    @DisplayName("ConstraintViolationException with no leaf dot → uses full path")
    void handlesConstraintViolationFlatPath() {
        MDC.put("requestId", "r2");
        try {
            ConstraintViolation<?> violation = mock(ConstraintViolation.class);
            Path path = mock(Path.class);
            when(path.toString()).thenReturn("query");
            when(violation.getPropertyPath()).thenReturn(path);
            when(violation.getMessage()).thenReturn("must match pattern");

            var ex = new ConstraintViolationException("", Set.of(violation));

            var response = handler.handleConstraintViolation(ex);
            assertThat(response.getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);
            assertThat(response.getBody().message()).isEqualTo("query: must match pattern");
        } finally {
            MDC.clear();
        }
    }
}
