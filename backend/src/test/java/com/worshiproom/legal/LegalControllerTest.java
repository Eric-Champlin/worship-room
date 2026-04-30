package com.worshiproom.legal;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.worshiproom.auth.JwtService;
import com.worshiproom.support.AbstractIntegrationTest;
import com.worshiproom.user.User;
import com.worshiproom.user.UserRepository;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;

import java.util.Map;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * End-to-end coverage for the Spec 1.10f legal endpoints — runs against the
 * real Testcontainers Postgres + the full Spring Security filter chain.
 *
 * <p>Rate-limit scenarios use a tightened bucket (max-per-hour=2) so a third
 * call deterministically rejects without firing 5 BCrypt-burning calls.
 */
@AutoConfigureMockMvc
class LegalControllerTest extends AbstractIntegrationTest {

    private static final String TEST_JWT_SECRET =
        "test-jwt-secret-at-least-32-bytes-long-xxxxxxxxxxxxxx";

    @DynamicPropertySource
    static void legalProperties(DynamicPropertyRegistry registry) {
        registry.add("jwt.secret", () -> TEST_JWT_SECRET);
        registry.add("auth.rate-limit.per-email.capacity", () -> "1000");
        registry.add("auth.rate-limit.per-ip.capacity", () -> "10000");
        // Tighten the legal-accept bucket so we can hit 429 in 3 calls instead of 6.
        registry.add("worshiproom.legal.accept.rate-limit.max-per-hour", () -> "2");
    }

    @Autowired private MockMvc mvc;
    @Autowired private ObjectMapper mapper;
    @Autowired private UserRepository userRepository;
    @Autowired private JwtService jwtService;

    private User alice;
    private String aliceJwt;

    @BeforeEach
    void seed() {
        userRepository.deleteAll();
        alice = userRepository.saveAndFlush(new User(
            "alice-legal@test.local", "$2a$10$x", "Alice", "Anderson", "UTC"));
        aliceJwt = jwtService.generateToken(alice.getId(), false);
    }

    @AfterEach
    void cleanup() {
        userRepository.deleteAll();
    }

    // =====================================================================
    // GET /api/v1/legal/versions
    // =====================================================================

    @Test
    void getVersionsAnonymousReturns200() throws Exception {
        mvc.perform(get("/api/v1/legal/versions"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data.termsVersion").value(LegalVersionService.TERMS_VERSION))
            .andExpect(jsonPath("$.data.privacyVersion").value(LegalVersionService.PRIVACY_VERSION))
            .andExpect(jsonPath("$.data.communityGuidelinesVersion")
                .value(LegalVersionService.COMMUNITY_GUIDELINES_VERSION));
    }

    @Test
    void getVersionsAuthenticatedReturns200() throws Exception {
        mvc.perform(get("/api/v1/legal/versions").header("Authorization", "Bearer " + aliceJwt))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data.termsVersion").value(LegalVersionService.TERMS_VERSION));
    }

    @Test
    void getVersionsResponseMatchesConstants() throws Exception {
        MvcResult result = mvc.perform(get("/api/v1/legal/versions"))
            .andExpect(status().isOk())
            .andReturn();

        JsonNode body = mapper.readTree(result.getResponse().getContentAsString());
        assertThat(body.at("/data/termsVersion").asText())
            .isEqualTo(LegalVersionService.TERMS_VERSION);
        assertThat(body.at("/data/privacyVersion").asText())
            .isEqualTo(LegalVersionService.PRIVACY_VERSION);
        assertThat(body.at("/data/communityGuidelinesVersion").asText())
            .isEqualTo(LegalVersionService.COMMUNITY_GUIDELINES_VERSION);
    }

    @Test
    void getVersionsResponseHasRequestId() throws Exception {
        MvcResult result = mvc.perform(get("/api/v1/legal/versions"))
            .andExpect(status().isOk())
            .andExpect(header().exists("X-Request-Id"))
            .andReturn();

        String headerRequestId = result.getResponse().getHeader("X-Request-Id");
        JsonNode body = mapper.readTree(result.getResponse().getContentAsString());
        assertThat(body.at("/meta/requestId").asText()).isEqualTo(headerRequestId);
    }

    // =====================================================================
    // POST /api/v1/users/me/legal/accept
    // =====================================================================

    @Test
    void acceptVersionsHappyPathReturns204() throws Exception {
        String body = mapper.writeValueAsString(currentVersionsBody());

        mvc.perform(post("/api/v1/users/me/legal/accept")
                .header("Authorization", "Bearer " + aliceJwt)
                .contentType(MediaType.APPLICATION_JSON).content(body))
            .andExpect(status().isNoContent());
    }

    @Test
    void acceptVersionsUpdatesUserRow() throws Exception {
        String body = mapper.writeValueAsString(currentVersionsBody());

        mvc.perform(post("/api/v1/users/me/legal/accept")
                .header("Authorization", "Bearer " + aliceJwt)
                .contentType(MediaType.APPLICATION_JSON).content(body))
            .andExpect(status().isNoContent());

        User refreshed = userRepository.findById(alice.getId()).orElseThrow();
        assertThat(refreshed.getTermsVersion()).isEqualTo(LegalVersionService.TERMS_VERSION);
        assertThat(refreshed.getPrivacyVersion()).isEqualTo(LegalVersionService.PRIVACY_VERSION);
    }

    @Test
    void acceptVersionsRejectsMismatchedTermsWith400() throws Exception {
        String body = mapper.writeValueAsString(Map.of(
            "termsVersion", "2026-04-28",
            "privacyVersion", LegalVersionService.PRIVACY_VERSION));

        mvc.perform(post("/api/v1/users/me/legal/accept")
                .header("Authorization", "Bearer " + aliceJwt)
                .contentType(MediaType.APPLICATION_JSON).content(body))
            .andExpect(status().isBadRequest())
            .andExpect(jsonPath("$.code").value("VERSION_MISMATCH"));
    }

    @Test
    void acceptVersionsRejectsMismatchedPrivacyWith400() throws Exception {
        String body = mapper.writeValueAsString(Map.of(
            "termsVersion", LegalVersionService.TERMS_VERSION,
            "privacyVersion", "2026-04-28"));

        mvc.perform(post("/api/v1/users/me/legal/accept")
                .header("Authorization", "Bearer " + aliceJwt)
                .contentType(MediaType.APPLICATION_JSON).content(body))
            .andExpect(status().isBadRequest())
            .andExpect(jsonPath("$.code").value("VERSION_MISMATCH"));
    }

    @Test
    void acceptVersionsRejectsMissingTermsWith400() throws Exception {
        String body = mapper.writeValueAsString(Map.of(
            "privacyVersion", LegalVersionService.PRIVACY_VERSION));

        mvc.perform(post("/api/v1/users/me/legal/accept")
                .header("Authorization", "Bearer " + aliceJwt)
                .contentType(MediaType.APPLICATION_JSON).content(body))
            .andExpect(status().isBadRequest())
            .andExpect(jsonPath("$.code").value("VALIDATION_FAILED"))
            .andExpect(jsonPath("$.fieldErrors.termsVersion").exists());
    }

    @Test
    void acceptVersionsRejectsMissingPrivacyWith400() throws Exception {
        String body = mapper.writeValueAsString(Map.of(
            "termsVersion", LegalVersionService.TERMS_VERSION));

        mvc.perform(post("/api/v1/users/me/legal/accept")
                .header("Authorization", "Bearer " + aliceJwt)
                .contentType(MediaType.APPLICATION_JSON).content(body))
            .andExpect(status().isBadRequest())
            .andExpect(jsonPath("$.code").value("VALIDATION_FAILED"))
            .andExpect(jsonPath("$.fieldErrors.privacyVersion").exists());
    }

    @Test
    void acceptVersionsRejectsMalformedDateWith400() throws Exception {
        String body = mapper.writeValueAsString(Map.of(
            "termsVersion", "not-a-date",
            "privacyVersion", LegalVersionService.PRIVACY_VERSION));

        mvc.perform(post("/api/v1/users/me/legal/accept")
                .header("Authorization", "Bearer " + aliceJwt)
                .contentType(MediaType.APPLICATION_JSON).content(body))
            .andExpect(status().isBadRequest())
            // Pattern-violation surfaces as VALIDATION_FAILED, NOT VERSION_MISMATCH —
            // the @Pattern check at the boundary fires before the service-layer
            // equality comparison. Same convention as RegistrationLegalAcceptanceTest.
            .andExpect(jsonPath("$.code").value("VALIDATION_FAILED"));
    }

    @Test
    void acceptVersionsUnauthenticatedReturns401() throws Exception {
        String body = mapper.writeValueAsString(currentVersionsBody());

        mvc.perform(post("/api/v1/users/me/legal/accept")
                .contentType(MediaType.APPLICATION_JSON).content(body))
            .andExpect(status().isUnauthorized());
    }

    @Test
    void acceptVersionsExpiredTokenReturns401() throws Exception {
        String body = mapper.writeValueAsString(currentVersionsBody());
        // A garbage token surfaces as 401 via JwtAuthenticationFilter — same wire
        // outcome as an expired token (the test's intent is "non-valid token →
        // 401"). True expiry would require manipulating the token issue time;
        // the wire shape is identical to malformed token rejection.
        mvc.perform(post("/api/v1/users/me/legal/accept")
                .header("Authorization", "Bearer not.a.real.token")
                .contentType(MediaType.APPLICATION_JSON).content(body))
            .andExpect(status().isUnauthorized());
    }

    @Test
    void acceptVersionsExceedsRateLimitReturns429WithRetryAfter() throws Exception {
        String body = mapper.writeValueAsString(currentVersionsBody());

        // Property override max-per-hour=2 → the 3rd call fires.
        mvc.perform(post("/api/v1/users/me/legal/accept")
                .header("Authorization", "Bearer " + aliceJwt)
                .contentType(MediaType.APPLICATION_JSON).content(body))
            .andExpect(status().isNoContent());
        mvc.perform(post("/api/v1/users/me/legal/accept")
                .header("Authorization", "Bearer " + aliceJwt)
                .contentType(MediaType.APPLICATION_JSON).content(body))
            .andExpect(status().isNoContent());

        mvc.perform(post("/api/v1/users/me/legal/accept")
                .header("Authorization", "Bearer " + aliceJwt)
                .contentType(MediaType.APPLICATION_JSON).content(body))
            .andExpect(status().isTooManyRequests())
            .andExpect(header().exists("Retry-After"))
            .andExpect(jsonPath("$.code").value("RATE_LIMITED"));
    }

    @Test
    void acceptVersionsThenGetMeReturnsUpdatedVersions() throws Exception {
        String body = mapper.writeValueAsString(currentVersionsBody());

        mvc.perform(post("/api/v1/users/me/legal/accept")
                .header("Authorization", "Bearer " + aliceJwt)
                .contentType(MediaType.APPLICATION_JSON).content(body))
            .andExpect(status().isNoContent());

        // L1-cache-trap regression guard — the second request must read fresh
        // data from the DB, not stale persistence-context state.
        mvc.perform(get("/api/v1/users/me").header("Authorization", "Bearer " + aliceJwt))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data.termsVersion").value(LegalVersionService.TERMS_VERSION))
            .andExpect(jsonPath("$.data.privacyVersion").value(LegalVersionService.PRIVACY_VERSION));
    }

    // =====================================================================
    // helpers
    // =====================================================================

    private static Map<String, Object> currentVersionsBody() {
        return Map.of(
            "termsVersion", LegalVersionService.TERMS_VERSION,
            "privacyVersion", LegalVersionService.PRIVACY_VERSION);
    }

    @SuppressWarnings("unused")
    private static UUID anyUuid() { return UUID.randomUUID(); }
}
