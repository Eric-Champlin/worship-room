package com.worshiproom.legal;

import com.fasterxml.jackson.databind.ObjectMapper;
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

import java.util.HashMap;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Integration coverage for Spec 1.10f registration extension — POST
 * /api/v1/auth/register validates termsVersion + privacyVersion BEFORE the
 * existing-email branch and persists both columns on the new user row.
 */
@AutoConfigureMockMvc
class RegistrationLegalAcceptanceTest extends AbstractIntegrationTest {

    private static final String TEST_JWT_SECRET =
        "test-jwt-secret-at-least-32-bytes-long-xxxxxxxxxxxxxx";

    @DynamicPropertySource
    static void registrationLegalProperties(DynamicPropertyRegistry registry) {
        registry.add("jwt.secret", () -> TEST_JWT_SECRET);
        registry.add("auth.rate-limit.per-email.capacity", () -> "1000");
        registry.add("auth.rate-limit.per-ip.capacity", () -> "10000");
    }

    @Autowired private MockMvc mvc;
    @Autowired private ObjectMapper mapper;
    @Autowired private UserRepository userRepository;

    @BeforeEach
    void clean() {
        userRepository.deleteAll();
    }

    @AfterEach
    void cleanup() {
        userRepository.deleteAll();
    }

    @Test
    void registerWithCurrentVersionsSucceeds() throws Exception {
        String body = mapper.writeValueAsString(buildRegisterBody(
            "happy@example.com",
            LegalVersionService.TERMS_VERSION,
            LegalVersionService.PRIVACY_VERSION));

        mvc.perform(post("/api/v1/auth/register")
                .contentType(MediaType.APPLICATION_JSON).content(body))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data.registered").value(true));
    }

    @Test
    void registerWithCurrentVersionsPersistsBothColumns() throws Exception {
        String body = mapper.writeValueAsString(buildRegisterBody(
            "persisted@example.com",
            LegalVersionService.TERMS_VERSION,
            LegalVersionService.PRIVACY_VERSION));

        mvc.perform(post("/api/v1/auth/register")
                .contentType(MediaType.APPLICATION_JSON).content(body))
            .andExpect(status().isOk());

        User saved = userRepository.findByEmailIgnoreCase("persisted@example.com").orElseThrow();
        assertThat(saved.getTermsVersion()).isEqualTo(LegalVersionService.TERMS_VERSION);
        assertThat(saved.getPrivacyVersion()).isEqualTo(LegalVersionService.PRIVACY_VERSION);
    }

    @Test
    void registerMissingTermsVersionReturns400() throws Exception {
        Map<String, Object> body = buildRegisterBody(
            "missing-terms@example.com",
            LegalVersionService.TERMS_VERSION,
            LegalVersionService.PRIVACY_VERSION);
        body.remove("termsVersion");

        mvc.perform(post("/api/v1/auth/register")
                .contentType(MediaType.APPLICATION_JSON)
                .content(mapper.writeValueAsString(body)))
            .andExpect(status().isBadRequest())
            .andExpect(jsonPath("$.fieldErrors.termsVersion").exists());
    }

    @Test
    void registerMissingPrivacyVersionReturns400() throws Exception {
        Map<String, Object> body = buildRegisterBody(
            "missing-privacy@example.com",
            LegalVersionService.TERMS_VERSION,
            LegalVersionService.PRIVACY_VERSION);
        body.remove("privacyVersion");

        mvc.perform(post("/api/v1/auth/register")
                .contentType(MediaType.APPLICATION_JSON)
                .content(mapper.writeValueAsString(body)))
            .andExpect(status().isBadRequest())
            .andExpect(jsonPath("$.fieldErrors.privacyVersion").exists());
    }

    @Test
    void registerOutdatedTermsVersionReturns400() throws Exception {
        String body = mapper.writeValueAsString(buildRegisterBody(
            "outdated-terms@example.com",
            "2026-04-28",
            LegalVersionService.PRIVACY_VERSION));

        mvc.perform(post("/api/v1/auth/register")
                .contentType(MediaType.APPLICATION_JSON).content(body))
            .andExpect(status().isBadRequest())
            .andExpect(jsonPath("$.code").value("VERSION_MISMATCH"));
    }

    @Test
    void registerFutureTermsVersionReturns400() throws Exception {
        String body = mapper.writeValueAsString(buildRegisterBody(
            "future-terms@example.com",
            "2027-12-31",
            LegalVersionService.PRIVACY_VERSION));

        mvc.perform(post("/api/v1/auth/register")
                .contentType(MediaType.APPLICATION_JSON).content(body))
            .andExpect(status().isBadRequest())
            .andExpect(jsonPath("$.code").value("VERSION_MISMATCH"));
    }

    @Test
    void registerOutdatedPrivacyVersionReturns400() throws Exception {
        String body = mapper.writeValueAsString(buildRegisterBody(
            "outdated-privacy@example.com",
            LegalVersionService.TERMS_VERSION,
            "2026-04-28"));

        mvc.perform(post("/api/v1/auth/register")
                .contentType(MediaType.APPLICATION_JSON).content(body))
            .andExpect(status().isBadRequest())
            .andExpect(jsonPath("$.code").value("VERSION_MISMATCH"));
    }

    @Test
    void registerMalformedVersionReturns400() throws Exception {
        String body = mapper.writeValueAsString(buildRegisterBody(
            "malformed@example.com",
            "garbage",
            LegalVersionService.PRIVACY_VERSION));

        mvc.perform(post("/api/v1/auth/register")
                .contentType(MediaType.APPLICATION_JSON).content(body))
            .andExpect(status().isBadRequest())
            // Pattern-violation surfaces as VALIDATION_FAILED, NOT VERSION_MISMATCH —
            // the @Pattern check at the boundary fires before the service-layer
            // equality comparison.
            .andExpect(jsonPath("$.code").value("VALIDATION_FAILED"));
    }

    private static Map<String, Object> buildRegisterBody(String email, String terms, String privacy) {
        Map<String, Object> body = new HashMap<>();
        body.put("email", email);
        body.put("password", "verylongpassword123");
        body.put("firstName", "Test");
        body.put("lastName", "User");
        body.put("timezone", "UTC");
        body.put("termsVersion", terms);
        body.put("privacyVersion", privacy);
        return body;
    }
}
