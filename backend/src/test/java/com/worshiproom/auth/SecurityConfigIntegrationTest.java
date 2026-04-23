package com.worshiproom.auth;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.worshiproom.support.AbstractIntegrationTest;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.Date;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.options;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * End-to-end integration test proving the combined filter chain behaves
 * correctly: RequestIdFilter → RateLimitFilter → DelegatingFilterProxy →
 * JwtAuthenticationFilter. This is the most valuable test in Spec 1.4 — it
 * is the only test that catches a regression where JwtAuthenticationFilter
 * gets inserted BEFORE RateLimitFilter (which would change the error-body
 * shape for unauthenticated proxy requests).
 *
 * Requires Docker running locally.
 */
@AutoConfigureMockMvc
class SecurityConfigIntegrationTest extends AbstractIntegrationTest {

    // Must be ≥ 32 bytes for HS256. Distinct from the dev-profile fallback so
    // tests are self-contained and do not inadvertently depend on dev-profile config.
    private static final String TEST_JWT_SECRET =
        "integration-test-jwt-secret-at-least-32-bytes-long-xxxxxxxxxxxxxx";

    @DynamicPropertySource
    static void properties(DynamicPropertyRegistry registry) {
        registry.add("jwt.secret", () -> TEST_JWT_SECRET);
    }

    @Autowired private MockMvc mvc;
    @Autowired private ObjectMapper objectMapper;
    @Value("${jwt.secret}") private String configuredSecret;

    // ─── Public route access (5 tests) ─────────────────────────────────────

    @Test
    @DisplayName("GET /api/v1/health is public — 200 without auth")
    void healthRouteIsPublic_returns200() throws Exception {
        mvc.perform(get("/api/v1/health"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.status").value("ok"));
    }

    @Test
    @DisplayName("GET /api/health (legacy) is public — 200 without auth")
    void legacyHealthRouteIsPublic_returns200() throws Exception {
        mvc.perform(get("/api/health"))
            .andExpect(status().isOk());
    }

    @Test
    @DisplayName("GET /api/hello (legacy) is public — 200 without auth")
    void legacyHelloRouteIsPublic_returns200() throws Exception {
        mvc.perform(get("/api/hello"))
            .andExpect(status().isOk());
    }

    @Test
    @DisplayName("GET /actuator/health is public — 200 without auth")
    void actuatorHealthIsPublic_returns200() throws Exception {
        mvc.perform(get("/actuator/health"))
            .andExpect(status().isOk());
    }

    @Test
    @DisplayName("OPTIONS preflight returns 200 — JWT filter must not reject OPTIONS")
    void corsPreflightReturns200() throws Exception {
        mvc.perform(options("/api/v1/users/me")
                .header("Origin", "http://localhost:5173")
                .header("Access-Control-Request-Method", "GET"))
            .andExpect(status().isOk());
    }

    // ─── Protected route rejection (4 tests) ───────────────────────────────

    @Test
    @DisplayName("Protected route without auth → 401 UNAUTHORIZED (AuthenticationEntryPoint fires)")
    void unmappedProtectedRouteReturns401WithUnauthorizedCode() throws Exception {
        mvc.perform(get("/api/v1/users/me"))
            .andExpect(status().isUnauthorized())
            .andExpect(jsonPath("$.code").value("UNAUTHORIZED"))
            .andExpect(jsonPath("$.requestId").exists());
    }

    @Test
    @DisplayName("Protected route with malformed JWT → 401 TOKEN_MALFORMED")
    void malformedJwtReturns401WithTokenMalformed() throws Exception {
        mvc.perform(get("/api/v1/users/me")
                .header(HttpHeaders.AUTHORIZATION, "Bearer not.a.jwt"))
            .andExpect(status().isUnauthorized())
            .andExpect(jsonPath("$.code").value("TOKEN_MALFORMED"))
            .andExpect(jsonPath("$.requestId").exists());
    }

    @Test
    @DisplayName("Protected route with expired JWT → 401 TOKEN_EXPIRED")
    void expiredJwtReturns401WithTokenExpired() throws Exception {
        String expiredToken = buildToken(UUID.randomUUID(), false, Instant.now().minusSeconds(60));

        mvc.perform(get("/api/v1/users/me")
                .header(HttpHeaders.AUTHORIZATION, "Bearer " + expiredToken))
            .andExpect(status().isUnauthorized())
            .andExpect(jsonPath("$.code").value("TOKEN_EXPIRED"));
    }

    @Test
    @DisplayName("Protected route with wrong-signature JWT → 401 TOKEN_INVALID")
    void wrongSignatureJwtReturns401WithTokenInvalid() throws Exception {
        // Sign with a DIFFERENT 32-byte secret than the configured one
        String wrongSecret = "different-secret-32-bytes-minimum-yyyyyyyyyyyyy";
        SecretKey wrongKey = Keys.hmacShaKeyFor(wrongSecret.getBytes(StandardCharsets.UTF_8));
        Instant now = Instant.now();
        String tokenWithBadSig = Jwts.builder()
            .subject(UUID.randomUUID().toString())
            .claim("is_admin", false)
            .issuedAt(Date.from(now))
            .expiration(Date.from(now.plusSeconds(3600)))
            .signWith(wrongKey, Jwts.SIG.HS256)
            .compact();

        mvc.perform(get("/api/v1/users/me")
                .header(HttpHeaders.AUTHORIZATION, "Bearer " + tokenWithBadSig))
            .andExpect(status().isUnauthorized())
            .andExpect(jsonPath("$.code").value("TOKEN_INVALID"));
    }

    // ─── Valid token behavior (1 test) ─────────────────────────────────────

    @Test
    @DisplayName("Valid JWT on unmapped protected route → 404 (NOT 401)")
    void validJwtOnUnmappedProtectedRouteReturns404NotDoubled401() throws Exception {
        String validToken = buildToken(UUID.randomUUID(), false, Instant.now().plusSeconds(3600));

        mvc.perform(get("/api/v1/users/me")
                .header(HttpHeaders.AUTHORIZATION, "Bearer " + validToken))
            .andExpect(status().isNotFound());
    }

    // ─── Proxy route anonymous-access contract (2 tests) ───────────────────

    @Test
    @DisplayName("Proxy route without auth → NOT 401 (permitAll holds; RateLimit headers emitted)")
    void proxyRouteIsAnonymousAccessible_respondsWithoutAuth() throws Exception {
        MvcResult result = mvc.perform(post("/api/v1/proxy/ai/explain")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{}"))
            .andReturn();

        // Auth must NOT reject. Validation/upstream errors (400/500/502) are acceptable.
        assertThat(result.getResponse().getStatus()).isNotEqualTo(401);

        // Proves RateLimitFilter ran before auth on this route.
        assertThat(result.getResponse().getHeader("X-RateLimit-Limit")).isNotNull();
        assertThat(result.getResponse().getHeader("X-RateLimit-Remaining")).isNotNull();
        assertThat(result.getResponse().getHeader("X-RateLimit-Reset")).isNotNull();
    }

    @Test
    @DisplayName("Proxy route WITH garbage JWT → NOT 401 (permitAll IGNORES the token)")
    void proxyRouteIgnoresInvalidJwt() throws Exception {
        MvcResult result = mvc.perform(post("/api/v1/proxy/ai/explain")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{}")
                .header(HttpHeaders.AUTHORIZATION, "Bearer garbage"))
            .andReturn();

        assertThat(result.getResponse().getStatus()).isNotEqualTo(401);
    }

    // ─── Filter chain ordering (2 tests) ───────────────────────────────────

    @Test
    @DisplayName("401 response from protected route carries X-Request-Id (RequestIdFilter ran)")
    void requestIdHeaderThreadedOnProtectedRouteReject() throws Exception {
        MvcResult result = mvc.perform(get("/api/v1/users/me"))
            .andExpect(status().isUnauthorized())
            .andReturn();

        String headerRequestId = result.getResponse().getHeader("X-Request-Id");
        assertThat(headerRequestId).isNotBlank();

        JsonNode body = objectMapper.readTree(result.getResponse().getContentAsString());
        assertThat(body.path("requestId").asText()).isEqualTo(headerRequestId);
    }

    @Test
    @DisplayName("Proxy route emits X-RateLimit-* headers — proves RateLimit ran before auth")
    void rateLimitHeadersEmitOnProxyRoute_provesRateLimitRanBeforeAuth() throws Exception {
        MvcResult result = mvc.perform(post("/api/v1/proxy/ai/explain")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{}"))
            .andReturn();

        assertThat(result.getResponse().getHeader("X-RateLimit-Limit")).isNotNull();
        assertThat(result.getResponse().getHeader("X-RateLimit-Remaining")).isNotNull();
        assertThat(result.getResponse().getHeader("X-RateLimit-Reset")).isNotNull();
    }

    // ─── Helpers ───────────────────────────────────────────────────────────

    private String buildToken(UUID userId, boolean isAdmin, Instant exp) {
        SecretKey key = Keys.hmacShaKeyFor(configuredSecret.getBytes(StandardCharsets.UTF_8));
        return Jwts.builder()
            .subject(userId.toString())
            .claim("is_admin", isAdmin)
            .issuedAt(Date.from(exp.minusSeconds(3600)))
            .expiration(Date.from(exp))
            .signWith(key, Jwts.SIG.HS256)
            .compact();
    }
}
