package com.example.worshiproom.proxy.common;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.slf4j.MDC;
import org.springframework.mock.web.MockFilterChain;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;

import jakarta.servlet.FilterChain;

import java.util.concurrent.atomic.AtomicReference;

import static org.assertj.core.api.Assertions.assertThat;

@DisplayName("RequestIdFilter")
class RequestIdFilterTest {

    private final RequestIdFilter filter = new RequestIdFilter();

    @Test
    @DisplayName("generates a 22-char base64 ID when none provided")
    void generatesIdWhenAbsent() throws Exception {
        var req = new MockHttpServletRequest();
        var res = new MockHttpServletResponse();
        filter.doFilter(req, res, new MockFilterChain());
        var id = res.getHeader("X-Request-Id");
        assertThat(id).isNotNull().hasSize(22);
    }

    @Test
    @DisplayName("honors a client-provided X-Request-Id")
    void honorsClientId() throws Exception {
        var clientId = "client-abc-123";
        var req = new MockHttpServletRequest();
        req.addHeader("X-Request-Id", clientId);
        var res = new MockHttpServletResponse();
        filter.doFilter(req, res, new MockFilterChain());
        assertThat(res.getHeader("X-Request-Id")).isEqualTo(clientId);
    }

    @Test
    @DisplayName("rejects oversized client IDs and generates instead")
    void rejectsOversizedId() throws Exception {
        var oversized = "x".repeat(100);
        var req = new MockHttpServletRequest();
        req.addHeader("X-Request-Id", oversized);
        var res = new MockHttpServletResponse();
        filter.doFilter(req, res, new MockFilterChain());
        assertThat(res.getHeader("X-Request-Id")).hasSize(22);
    }

    @Test
    @DisplayName("populates MDC during filter chain and clears after")
    void mdcPopulatedAndCleared() throws Exception {
        var capturedMdc = new AtomicReference<String>();
        var req = new MockHttpServletRequest();
        var res = new MockHttpServletResponse();
        FilterChain chain = (rq, rs) -> capturedMdc.set(MDC.get(RequestIdFilter.MDC_KEY));
        filter.doFilter(req, res, chain);
        assertThat(capturedMdc.get()).isNotNull().hasSize(22);
        assertThat(MDC.get(RequestIdFilter.MDC_KEY)).isNull();
    }
}
