package com.worshiproom.config;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.worshiproom.support.AbstractIntegrationTest;
import com.worshiproom.user.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.mock.web.MockFilterChain;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.test.web.servlet.MockMvc;

import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@DisplayName("SecurityHeadersConfig")
class SecurityHeadersConfigTest {

    private static final String HSTS = "Strict-Transport-Security";
    private static final String XCTO = "X-Content-Type-Options";
    private static final String XFO = "X-Frame-Options";
    private static final String RP = "Referrer-Policy";
    private static final String CSP = "Content-Security-Policy";
    private static final String PP = "Permissions-Policy";

    @Nested
    @DisplayName("Unit tests (filter direct)")
    class UnitTests {

        @Test
        @DisplayName("headersPresentOnUnmatchedPath — filter sets all six headers regardless of downstream chain outcome")
        void headersPresentOnUnmatchedPath() throws Exception {
            // Test 4: simulates an unmatched-path request reaching the filter
            // before any controller match. Filter must set all six headers
            // unconditionally before chain.doFilter().
            var filter = new SecurityHeadersConfig.SecurityHeadersFilter();
            var req = new MockHttpServletRequest("GET", "/this-path-does-not-exist");
            var res = new MockHttpServletResponse();
            filter.doFilter(req, res, new MockFilterChain());

            assertThat(res.getHeader(HSTS)).isEqualTo(SecurityHeadersConfig.HSTS_VALUE);
            assertThat(res.getHeader(XCTO)).isEqualTo(SecurityHeadersConfig.X_CONTENT_TYPE_OPTIONS_VALUE);
            assertThat(res.getHeader(XFO)).isEqualTo(SecurityHeadersConfig.X_FRAME_OPTIONS_VALUE);
            assertThat(res.getHeader(RP)).isEqualTo(SecurityHeadersConfig.REFERRER_POLICY_VALUE);
            assertThat(res.getHeader(CSP)).isEqualTo(SecurityHeadersConfig.CSP_VALUE);
            assertThat(res.getHeader(PP)).isEqualTo(SecurityHeadersConfig.PERMISSIONS_POLICY_VALUE);
        }

        @Test
        @DisplayName("csp_directiveStringMatchesCanonical — guards CSP wording against accidental rewording")
        void csp_directiveStringMatchesCanonical() {
            // Test 5: Pin the exact CSP directive string. If a future tightening
            // accidentally drops `frame-ancestors 'none'` or rewords a directive,
            // this test fails loudly.
            String expected = "default-src 'self'; "
                + "script-src 'self'; "
                + "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; "
                + "font-src 'self' https://fonts.gstatic.com; "
                + "img-src 'self' data: https:; "
                + "connect-src 'self' https://worship-room-production.up.railway.app https://api.spotify.com; "
                + "frame-src 'self' https://open.spotify.com; "
                + "frame-ancestors 'none'; "
                + "base-uri 'self'; "
                + "form-action 'self'; "
                + "upgrade-insecure-requests";

            assertThat(SecurityHeadersConfig.CSP_VALUE).isEqualTo(expected);
        }

        @Test
        @DisplayName("permissionsPolicy_directiveStringMatchesCanonical — guards Permissions-Policy wording against accidental rewording")
        void permissionsPolicy_directiveStringMatchesCanonical() {
            // Parallel guard to csp_directiveStringMatchesCanonical: pins the
            // exact Permissions-Policy directive string. Permissions-Policy
            // uses `, ` (comma space) as the directive separator — different
            // from CSP's `; ` — so a future change that mistakenly rewords or
            // reorders directives would otherwise slip past the
            // header-existence assertions in the integration tests.
            String expected = "accelerometer=(), "
                + "camera=(), "
                + "geolocation=(self), "
                + "gyroscope=(), "
                + "magnetometer=(), "
                + "microphone=(), "
                + "payment=(), "
                + "usb=()";

            assertThat(SecurityHeadersConfig.PERMISSIONS_POLICY_VALUE).isEqualTo(expected);
        }
    }

    @Nested
    @DisplayName("Integration tests (full Spring context)")
    @SpringBootTest(properties = {
        "auth.rate-limit.per-email.capacity=5",
        "auth.rate-limit.per-email.window-minutes=15",
        "auth.rate-limit.per-ip.capacity=20",
        "auth.rate-limit.per-ip.window-minutes=15"
    })
    @AutoConfigureMockMvc
    class IntegrationTests extends AbstractIntegrationTest {

        @DynamicPropertySource
        static void integrationProperties(DynamicPropertyRegistry registry) {
            registry.add("jwt.secret",
                () -> "test-jwt-secret-at-least-32-bytes-long-xxxxxxxxxxxxxx");
            registry.add("proxy.trust-forwarded-headers", () -> "true");
        }

        @Autowired private MockMvc mvc;
        @Autowired private ObjectMapper mapper;
        @Autowired private UserRepository userRepository;

        @BeforeEach
        void clean() { userRepository.deleteAll(); }

        @Test
        @DisplayName("headersPresentOnControllerSuccess — GET /actuator/health (200) carries all six headers")
        void headersPresentOnControllerSuccess() throws Exception {
            // Test 1: controller-served 200 path. /actuator/health is in
            // PublicPaths.PATTERNS so JWT does not intercept.
            mvc.perform(get("/actuator/health"))
                .andExpect(status().isOk())
                .andExpect(header().string(HSTS, SecurityHeadersConfig.HSTS_VALUE))
                .andExpect(header().string(XCTO, SecurityHeadersConfig.X_CONTENT_TYPE_OPTIONS_VALUE))
                .andExpect(header().string(XFO, SecurityHeadersConfig.X_FRAME_OPTIONS_VALUE))
                .andExpect(header().string(RP, SecurityHeadersConfig.REFERRER_POLICY_VALUE))
                .andExpect(header().string(CSP, SecurityHeadersConfig.CSP_VALUE))
                .andExpect(header().string(PP, SecurityHeadersConfig.PERMISSIONS_POLICY_VALUE));
        }

        @Test
        @DisplayName("headersPresentOnFilterRaised401 — GET /api/v1/users/me with no Authorization carries all six headers")
        void headersPresentOnFilterRaised401() throws Exception {
            // Test 2: PROTECTS AGAINST THE 1.10 CORS BUG CLASS. The 401 here
            // is written via RestAuthenticationEntryPoint — same code path
            // that bypassed CORS decoration in 1.10. Security-headers filter
            // at +6 sets headers BEFORE that code path runs, so they survive.
            mvc.perform(get("/api/v1/users/me"))
                .andExpect(status().isUnauthorized())
                .andExpect(header().string(HSTS, SecurityHeadersConfig.HSTS_VALUE))
                .andExpect(header().string(XCTO, SecurityHeadersConfig.X_CONTENT_TYPE_OPTIONS_VALUE))
                .andExpect(header().string(XFO, SecurityHeadersConfig.X_FRAME_OPTIONS_VALUE))
                .andExpect(header().string(RP, SecurityHeadersConfig.REFERRER_POLICY_VALUE))
                .andExpect(header().string(CSP, SecurityHeadersConfig.CSP_VALUE))
                .andExpect(header().string(PP, SecurityHeadersConfig.PERMISSIONS_POLICY_VALUE));
        }

        @Test
        @DisplayName("headersPresentOnFilterRaised429 — 6th login attempt same email carries all six headers + Retry-After")
        void headersPresentOnFilterRaised429() throws Exception {
            // Test 3: Hits the per-email rate limit (capacity=5) on the 6th
            // attempt. The 429 is written from inside LoginRateLimitFilter
            // via handlerExceptionResolver.resolveException(...) — same
            // filter-raised path Test 2 exercises but at the rate-limit
            // filter rather than JWT.
            String body = mapper.writeValueAsString(Map.of(
                "email", "headers-test@example.com",
                "password", "whatever12345"));
            String ip = "10.99.99.1"; // unique per test (LoginRateLimitFilterTest precedent)

            for (int i = 0; i < 5; i++) {
                mvc.perform(post("/api/v1/auth/login")
                    .header("X-Forwarded-For", ip)
                    .contentType(MediaType.APPLICATION_JSON)
                    .content(body));
            }
            mvc.perform(post("/api/v1/auth/login")
                    .header("X-Forwarded-For", ip)
                    .contentType(MediaType.APPLICATION_JSON)
                    .content(body))
                .andExpect(status().isTooManyRequests())
                .andExpect(header().exists("Retry-After"))
                .andExpect(header().string(HSTS, SecurityHeadersConfig.HSTS_VALUE))
                .andExpect(header().string(XCTO, SecurityHeadersConfig.X_CONTENT_TYPE_OPTIONS_VALUE))
                .andExpect(header().string(XFO, SecurityHeadersConfig.X_FRAME_OPTIONS_VALUE))
                .andExpect(header().string(RP, SecurityHeadersConfig.REFERRER_POLICY_VALUE))
                .andExpect(header().string(CSP, SecurityHeadersConfig.CSP_VALUE))
                .andExpect(header().string(PP, SecurityHeadersConfig.PERMISSIONS_POLICY_VALUE));
        }
    }
}
