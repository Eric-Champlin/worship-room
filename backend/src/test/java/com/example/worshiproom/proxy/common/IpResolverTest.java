package com.example.worshiproom.proxy.common;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockHttpServletRequest;

import static org.assertj.core.api.Assertions.assertThat;

@DisplayName("IpResolver")
class IpResolverTest {

    private final IpResolver resolver = new IpResolver(true);

    @Test
    void prefersXForwardedForOverRemoteAddr() {
        var req = new MockHttpServletRequest();
        req.setRemoteAddr("10.0.0.1");
        req.addHeader("X-Forwarded-For", "203.0.113.99");
        assertThat(resolver.resolve(req)).isEqualTo("203.0.113.99");
    }

    @Test
    void usesLeftmostXForwardedForEntry() {
        var req = new MockHttpServletRequest();
        req.addHeader("X-Forwarded-For", "203.0.113.99, 198.51.100.1, 192.0.2.50");
        assertThat(resolver.resolve(req)).isEqualTo("203.0.113.99");
    }

    @Test
    void fallsBackToXRealIp() {
        var req = new MockHttpServletRequest();
        req.setRemoteAddr("10.0.0.1");
        req.addHeader("X-Real-IP", "203.0.113.50");
        assertThat(resolver.resolve(req)).isEqualTo("203.0.113.50");
    }

    @Test
    void fallsBackToRemoteAddr() {
        var req = new MockHttpServletRequest();
        req.setRemoteAddr("10.0.0.99");
        assertThat(resolver.resolve(req)).isEqualTo("10.0.0.99");
    }

    @Test
    void returnsUnknownWhenAllFail() {
        var req = new MockHttpServletRequest();
        req.setRemoteAddr("");
        assertThat(resolver.resolve(req)).isEqualTo("unknown");
    }

    @Test
    void trimsWhitespaceFromHeaders() {
        var req = new MockHttpServletRequest();
        req.addHeader("X-Forwarded-For", "  203.0.113.99  , 198.51.100.1");
        assertThat(resolver.resolve(req)).isEqualTo("203.0.113.99");
    }

    @Test
    @DisplayName("ignores X-Forwarded-For when trustForwardedHeaders is false")
    void ignoresXForwardedForWhenNotTrusted() {
        var untrustingResolver = new IpResolver(false);
        var req = new MockHttpServletRequest();
        req.setRemoteAddr("10.0.0.1");
        req.addHeader("X-Forwarded-For", "203.0.113.99");
        // XFF is ignored — falls through to remoteAddr
        assertThat(untrustingResolver.resolve(req)).isEqualTo("10.0.0.1");
    }

    @Test
    @DisplayName("ignores X-Real-IP when trustForwardedHeaders is false")
    void ignoresXRealIpWhenNotTrusted() {
        var untrustingResolver = new IpResolver(false);
        var req = new MockHttpServletRequest();
        req.setRemoteAddr("10.0.0.1");
        req.addHeader("X-Real-IP", "203.0.113.50");
        assertThat(untrustingResolver.resolve(req)).isEqualTo("10.0.0.1");
    }
}
