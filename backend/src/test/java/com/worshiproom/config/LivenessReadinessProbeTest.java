package com.worshiproom.config;

import com.worshiproom.support.AbstractIntegrationTest;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.test.web.servlet.MockMvc;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Verifies the Spring Boot Actuator liveness and readiness probes (Spec 1.10j).
 *
 * <p>Purpose: prove that
 * <ol>
 *   <li>{@code /actuator/health/liveness} and {@code /actuator/health/readiness}
 *       exist (probe enablement in {@code application.properties} took effect),</li>
 *   <li>both endpoints return {@code 200 {"status":"UP"}} once the
 *       ApplicationContext is fully refreshed (which is the case in any
 *       {@code @SpringBootTest} run),</li>
 *   <li>both endpoints are publicly accessible without an Authorization header
 *       ({@link com.worshiproom.auth.PublicPaths} extension took effect),</li>
 *   <li>both endpoints carry the six security headers from Spec 1.10g
 *       (cross-spec integration check — proves
 *       {@link SecurityHeadersConfig.SecurityHeadersFilter} decorates probe
 *       responses too).</li>
 * </ol>
 *
 * <p>Extends {@link AbstractIntegrationTest} (full Spring context + singleton
 * Testcontainers PostgreSQL) because readiness state depends on
 * {@code ApplicationContext} refresh completing — which requires Liquibase
 * having run against a real database. {@code @WebMvcTest} would short-circuit
 * that and prove nothing.
 *
 * <p><b>Package-placement note (Spec 1.10j Execution Log deviation):</b> the
 * original plan called for placing this class under {@code com.worshiproom.health}
 * for topic colocation. During execution that proved incompatible with the
 * package-private visibility of {@link SecurityHeadersConfig}'s {@code *_VALUE}
 * constants — those constants are intentionally package-private to keep header
 * policy localized. Rather than weaken that visibility just to allow a test to
 * import them from a sibling package, the test lives next to
 * {@link SecurityHeadersConfigTest} in {@code com.worshiproom.config}.
 */
@AutoConfigureMockMvc
@SpringBootTest(properties = {
    "auth.rate-limit.per-email.capacity=5",
    "auth.rate-limit.per-email.window-minutes=15",
    "auth.rate-limit.per-ip.capacity=20",
    "auth.rate-limit.per-ip.window-minutes=15"
})
class LivenessReadinessProbeTest extends AbstractIntegrationTest {

    private static final String HSTS = "Strict-Transport-Security";
    private static final String XCTO = "X-Content-Type-Options";
    private static final String XFO = "X-Frame-Options";
    private static final String RP = "Referrer-Policy";
    private static final String CSP = "Content-Security-Policy";
    private static final String PP = "Permissions-Policy";

    @DynamicPropertySource
    static void probeProperties(DynamicPropertyRegistry registry) {
        registry.add("jwt.secret",
            () -> "test-jwt-secret-at-least-32-bytes-long-xxxxxxxxxxxxxx");
    }

    @Autowired private MockMvc mvc;

    @Test
    @DisplayName("livenessProbe_returnsUpWithStatusOnly — GET /actuator/health/liveness → 200, $.status=UP")
    void livenessProbe_returnsUpWithStatusOnly() throws Exception {
        mvc.perform(get("/actuator/health/liveness"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.status").value("UP"));
    }

    @Test
    @DisplayName("readinessProbe_returnsUpWhenAppFullyBooted — GET /actuator/health/readiness → 200, $.status=UP")
    void readinessProbe_returnsUpWhenAppFullyBooted() throws Exception {
        mvc.perform(get("/actuator/health/readiness"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.status").value("UP"));
    }

    @Test
    @DisplayName("livenessProbe_isPubliclyAccessible_noJwtRequired — GET with no Authorization → 200, NOT 401")
    void livenessProbe_isPubliclyAccessible_noJwtRequired() throws Exception {
        // Asserts PublicPaths.PATTERNS extension took effect — without
        // /actuator/health/liveness in the list, JwtAuthenticationFilter would
        // not skip the path and the missing Authorization header would route
        // through SecurityConfig's authenticated() rule to RestAuthenticationEntryPoint
        // → 401.
        mvc.perform(get("/actuator/health/liveness"))
            .andExpect(status().isOk());
    }

    @Test
    @DisplayName("readinessProbe_isPubliclyAccessible_noJwtRequired — GET with no Authorization → 200, NOT 401")
    void readinessProbe_isPubliclyAccessible_noJwtRequired() throws Exception {
        mvc.perform(get("/actuator/health/readiness"))
            .andExpect(status().isOk());
    }

    @Test
    @DisplayName("probesEmitSecurityHeaders — both probes carry all six 1.10g security headers")
    void probesEmitSecurityHeaders() throws Exception {
        // Cross-spec integration check: 1.10g's SecurityHeadersFilter at
        // HIGHEST_PRECEDENCE+6 must decorate probe responses. If a future
        // refactor moves SecurityHeadersFilter behind the actuator chain, or
        // if Spring Boot's actuator response writer bypasses the filter chain
        // for some sub-paths, this test fails loudly.
        mvc.perform(get("/actuator/health/liveness"))
            .andExpect(status().isOk())
            .andExpect(header().string(HSTS, SecurityHeadersConfig.HSTS_VALUE))
            .andExpect(header().string(XCTO, SecurityHeadersConfig.X_CONTENT_TYPE_OPTIONS_VALUE))
            .andExpect(header().string(XFO, SecurityHeadersConfig.X_FRAME_OPTIONS_VALUE))
            .andExpect(header().string(RP, SecurityHeadersConfig.REFERRER_POLICY_VALUE))
            .andExpect(header().string(CSP, SecurityHeadersConfig.CSP_VALUE))
            .andExpect(header().string(PP, SecurityHeadersConfig.PERMISSIONS_POLICY_VALUE));

        mvc.perform(get("/actuator/health/readiness"))
            .andExpect(status().isOk())
            .andExpect(header().string(HSTS, SecurityHeadersConfig.HSTS_VALUE))
            .andExpect(header().string(XCTO, SecurityHeadersConfig.X_CONTENT_TYPE_OPTIONS_VALUE))
            .andExpect(header().string(XFO, SecurityHeadersConfig.X_FRAME_OPTIONS_VALUE))
            .andExpect(header().string(RP, SecurityHeadersConfig.REFERRER_POLICY_VALUE))
            .andExpect(header().string(CSP, SecurityHeadersConfig.CSP_VALUE))
            .andExpect(header().string(PP, SecurityHeadersConfig.PERMISSIONS_POLICY_VALUE));
    }
}
