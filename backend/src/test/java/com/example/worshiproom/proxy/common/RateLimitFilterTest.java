package com.example.worshiproom.proxy.common;

import com.example.worshiproom.config.ProxyConfig;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.mock.web.MockFilterChain;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;
import org.springframework.web.servlet.HandlerExceptionResolver;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;

@DisplayName("RateLimitFilter")
class RateLimitFilterTest {

    private RateLimitFilter filter;
    private ProxyConfig config;
    private HandlerExceptionResolver resolver;

    @BeforeEach
    void setUp() {
        config = new ProxyConfig();
        config.getRateLimit().setBurstCapacity(3);
        config.getRateLimit().setRequestsPerMinute(60);
        resolver = mock(HandlerExceptionResolver.class);
        filter = new RateLimitFilter(config, new IpResolver(true), resolver);
    }

    @Test
    @DisplayName("allows requests up to the burst capacity")
    void allowsBurstCapacityRequests() throws Exception {
        for (int i = 0; i < 3; i++) {
            var req = new MockHttpServletRequest("POST", "/api/v1/proxy/ai/explain");
            req.setRemoteAddr("10.0.0.1");
            var res = new MockHttpServletResponse();
            filter.doFilter(req, res, new MockFilterChain());
            assertThat(res.getHeader("X-RateLimit-Limit")).isEqualTo("3");
            assertThat(res.getHeader("X-RateLimit-Remaining")).isNotNull();
        }
    }

    @Test
    @DisplayName("delegates to HandlerExceptionResolver and skips chain when bucket is empty")
    void delegatesToResolverWhenBucketEmpty() throws Exception {
        var ip = "10.0.0.2";
        for (int i = 0; i < 3; i++) {
            var req = new MockHttpServletRequest("POST", "/api/v1/proxy/ai/explain");
            req.setRemoteAddr(ip);
            filter.doFilter(req, new MockHttpServletResponse(), new MockFilterChain());
        }

        var req = new MockHttpServletRequest("POST", "/api/v1/proxy/ai/explain");
        req.setRemoteAddr(ip);
        var res = new MockHttpServletResponse();
        var chain = mock(jakarta.servlet.FilterChain.class);
        filter.doFilter(req, res, chain);

        var captor = ArgumentCaptor.forClass(Exception.class);
        verify(resolver).resolveException(eq(req), eq(res), eq(null), captor.capture());
        assertThat(captor.getValue()).isInstanceOf(RateLimitExceededException.class);
        var rle = (RateLimitExceededException) captor.getValue();
        assertThat(rle.getRetryAfterSeconds()).isGreaterThan(0L);
        verify(chain, never()).doFilter(any(), any());
    }

    @Test
    @DisplayName("buckets are isolated per IP")
    void isolatedPerIp() throws Exception {
        for (int i = 0; i < 3; i++) {
            var req = new MockHttpServletRequest("POST", "/api/v1/proxy/ai/explain");
            req.setRemoteAddr("10.0.0.3");
            filter.doFilter(req, new MockHttpServletResponse(), new MockFilterChain());
        }
        var req = new MockHttpServletRequest("POST", "/api/v1/proxy/ai/explain");
        req.setRemoteAddr("10.0.0.4");
        var res = new MockHttpServletResponse();
        filter.doFilter(req, res, new MockFilterChain());
        assertThat(res.getStatus()).isEqualTo(200);
    }

    @Test
    @DisplayName("does not enforce on non-proxy paths")
    void skipsNonProxyPaths() throws Exception {
        var req = new MockHttpServletRequest("GET", "/api/v1/health");
        req.setRemoteAddr("10.0.0.5");
        var res = new MockHttpServletResponse();
        var chain = new MockFilterChain();
        filter.doFilter(req, res, chain);
        assertThat(res.getHeader("X-RateLimit-Limit")).isNull();
    }

    @Test
    @DisplayName("uses X-Forwarded-For when present")
    void respectsXForwardedFor() throws Exception {
        var ip = "203.0.113.99";
        for (int i = 0; i < 3; i++) {
            var req = new MockHttpServletRequest("POST", "/api/v1/proxy/ai/explain");
            req.setRemoteAddr("10.0.0.1");
            req.addHeader("X-Forwarded-For", ip);
            filter.doFilter(req, new MockHttpServletResponse(), new MockFilterChain());
        }

        var req = new MockHttpServletRequest("POST", "/api/v1/proxy/ai/explain");
        req.setRemoteAddr("10.0.0.1");
        req.addHeader("X-Forwarded-For", ip);
        var res = new MockHttpServletResponse();
        var chain = mock(jakarta.servlet.FilterChain.class);
        filter.doFilter(req, res, chain);

        verify(resolver).resolveException(eq(req), eq(res), eq(null), any(RateLimitExceededException.class));
        verify(chain, never()).doFilter(any(), any());
    }
}
