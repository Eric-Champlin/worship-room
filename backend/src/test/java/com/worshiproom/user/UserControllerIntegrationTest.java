package com.worshiproom.user;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.worshiproom.auth.JwtService;
import com.worshiproom.support.AbstractIntegrationTest;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.test.web.servlet.MockMvc;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.HashMap;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@AutoConfigureMockMvc
class UserControllerIntegrationTest extends AbstractIntegrationTest {

    private static final String TEST_JWT_SECRET =
        "test-jwt-secret-at-least-32-bytes-long-xxxxxxxxxxxxxx";

    @DynamicPropertySource
    static void properties(DynamicPropertyRegistry registry) {
        registry.add("jwt.secret", () -> TEST_JWT_SECRET);
        // Auth-rate-limit properties needed because LoginRateLimitFilter is in the
        // bean graph; values are inflated to ensure they never fire during user tests.
        registry.add("auth.rate-limit.per-email.capacity", () -> "1000");
        registry.add("auth.rate-limit.per-ip.capacity", () -> "10000");
    }

    @Autowired private MockMvc mvc;
    @Autowired private ObjectMapper mapper;
    @Autowired private UserRepository userRepository;
    @Autowired private JwtService jwtService;

    private User seedUser;
    private String validToken;

    @BeforeEach
    void clean() {
        userRepository.deleteAll();
        seedUser = userRepository.save(
            new User("me@example.com", "$2a$10$x", "Seed", "User", "America/Chicago"));
        validToken = jwtService.generateToken(seedUser.getId(), seedUser.isAdmin());
    }

    // --- GET /api/v1/users/me ---

    @Test
    void getMe_withValidTokenReturnsFullProfile() throws Exception {
        mvc.perform(get("/api/v1/users/me").header("Authorization", "Bearer " + validToken))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data.id").value(seedUser.getId().toString()))
            .andExpect(jsonPath("$.data.email").value("me@example.com"))
            .andExpect(jsonPath("$.data.displayName").value("Seed"))
            .andExpect(jsonPath("$.data.firstName").value("Seed"))
            .andExpect(jsonPath("$.data.lastName").value("User"))
            .andExpect(jsonPath("$.data.displayNamePreference").value("first_only"))
            .andExpect(jsonPath("$.data.timezone").value("America/Chicago"))
            .andExpect(jsonPath("$.data.isAdmin").value(false))
            .andExpect(jsonPath("$.data.isEmailVerified").value(false))
            .andExpect(jsonPath("$.data.joinedAt").exists())
            .andExpect(jsonPath("$.meta.requestId").exists());
    }

    @Test
    void getMe_withoutTokenReturns401() throws Exception {
        mvc.perform(get("/api/v1/users/me"))
            .andExpect(status().isUnauthorized())
            .andExpect(jsonPath("$.code").value("UNAUTHORIZED"));
    }

    @Test
    void getMe_withExpiredTokenReturns401() throws Exception {
        // Generate a token signed with the same secret but already expired.
        String expiredToken = io.jsonwebtoken.Jwts.builder()
            .subject(seedUser.getId().toString())
            .issuedAt(java.util.Date.from(Instant.now().minus(2, ChronoUnit.HOURS)))
            .expiration(java.util.Date.from(Instant.now().minus(1, ChronoUnit.HOURS)))
            .claim("is_admin", false)
            .signWith(io.jsonwebtoken.security.Keys.hmacShaKeyFor(TEST_JWT_SECRET.getBytes()))
            .compact();

        mvc.perform(get("/api/v1/users/me").header("Authorization", "Bearer " + expiredToken))
            .andExpect(status().isUnauthorized())
            .andExpect(jsonPath("$.code").value("TOKEN_EXPIRED"));
    }

    @Test
    void getMe_userDeletedAfterTokenIssuanceReturns401UserNotFound() throws Exception {
        // Issue a token, then delete the user, then request /me.
        userRepository.deleteById(seedUser.getId());

        mvc.perform(get("/api/v1/users/me").header("Authorization", "Bearer " + validToken))
            .andExpect(status().isUnauthorized())
            .andExpect(jsonPath("$.code").value("USER_NOT_FOUND"));
    }

    // --- PATCH /api/v1/users/me: happy paths ---

    @Test
    void patchMe_updatesFirstNameAndRecomputesDisplayName() throws Exception {
        String body = "{\"firstName\": \"Robert\"}";
        mvc.perform(patch("/api/v1/users/me")
                .header("Authorization", "Bearer " + validToken)
                .contentType(MediaType.APPLICATION_JSON).content(body))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data.firstName").value("Robert"))
            .andExpect(jsonPath("$.data.displayName").value("Robert"))
            .andExpect(jsonPath("$.data.lastName").value("User")); // unchanged
    }

    @Test
    void patchMe_omittedFieldsAreUntouched() throws Exception {
        String body = "{\"timezone\": \"Europe/London\"}";
        mvc.perform(patch("/api/v1/users/me")
                .header("Authorization", "Bearer " + validToken)
                .contentType(MediaType.APPLICATION_JSON).content(body))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data.firstName").value("Seed")) // unchanged
            .andExpect(jsonPath("$.data.lastName").value("User"))   // unchanged
            .andExpect(jsonPath("$.data.timezone").value("Europe/London"));
    }

    @Test
    void patchMe_explicitNullClearsNullableField() throws Exception {
        seedUser.setBio("old bio");
        userRepository.saveAndFlush(seedUser);

        String body = "{\"bio\": null}";
        mvc.perform(patch("/api/v1/users/me")
                .header("Authorization", "Bearer " + validToken)
                .contentType(MediaType.APPLICATION_JSON).content(body))
            .andExpect(status().isOk())
            // Null bio omitted from response by global spring.jackson.default-property-inclusion=non_null
            // (application.properties:16) — not the @JsonInclude on ProxyResponse.
            .andExpect(jsonPath("$.data.bio").doesNotExist());
    }

    @Test
    void patchMe_setsAllNullableFields() throws Exception {
        Map<String, Object> body = new HashMap<>();
        body.put("avatarUrl", "https://example.com/avatar.jpg");
        body.put("bio", "Walking with Christ.");
        body.put("favoriteVerseReference", "Romans 8:28");
        body.put("favoriteVerseText", "And we know that all things work together for good...");

        mvc.perform(patch("/api/v1/users/me")
                .header("Authorization", "Bearer " + validToken)
                .contentType(MediaType.APPLICATION_JSON)
                .content(mapper.writeValueAsString(body)))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data.avatarUrl").value("https://example.com/avatar.jpg"))
            .andExpect(jsonPath("$.data.bio").value("Walking with Christ."))
            .andExpect(jsonPath("$.data.favoriteVerseReference").value("Romans 8:28"))
            .andExpect(jsonPath("$.data.favoriteVerseText").value("And we know that all things work together for good..."));
    }

    @Test
    void patchMe_setCustomPreferenceAndCustomNameTogether() throws Exception {
        Map<String, Object> body = Map.of(
            "displayNamePreference", "custom",
            "customDisplayName", "Pastor Seed"
        );
        mvc.perform(patch("/api/v1/users/me")
                .header("Authorization", "Bearer " + validToken)
                .contentType(MediaType.APPLICATION_JSON)
                .content(mapper.writeValueAsString(body)))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data.displayNamePreference").value("custom"))
            .andExpect(jsonPath("$.data.customDisplayName").value("Pastor Seed"))
            .andExpect(jsonPath("$.data.displayName").value("Pastor Seed"));
    }

    // --- PATCH: 400 INVALID_INPUT cases ---

    @Test
    void patchMe_invalidTimezoneReturns400() throws Exception {
        mvc.perform(patch("/api/v1/users/me")
                .header("Authorization", "Bearer " + validToken)
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"timezone\": \"Not/AZone\"}"))
            .andExpect(status().isBadRequest())
            .andExpect(jsonPath("$.code").value("INVALID_INPUT"))
            .andExpect(jsonPath("$.message").value(
                org.hamcrest.Matchers.containsString("Unknown timezone identifier")));
    }

    @Test
    void patchMe_customPreferenceWithoutCustomNameReturns400() throws Exception {
        // seedUser.customDisplayName is null; setting preference alone → 400.
        mvc.perform(patch("/api/v1/users/me")
                .header("Authorization", "Bearer " + validToken)
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"displayNamePreference\": \"custom\"}"))
            .andExpect(status().isBadRequest())
            .andExpect(jsonPath("$.code").value("INVALID_INPUT"))
            .andExpect(jsonPath("$.message").value(
                org.hamcrest.Matchers.containsString("Custom display name required")));
    }

    @Test
    void patchMe_invalidPreferenceValueReturns400() throws Exception {
        mvc.perform(patch("/api/v1/users/me")
                .header("Authorization", "Bearer " + validToken)
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"displayNamePreference\": \"UPPER_CASE\"}"))
            .andExpect(status().isBadRequest())
            .andExpect(jsonPath("$.code").value("INVALID_INPUT"))
            .andExpect(jsonPath("$.message").value(
                org.hamcrest.Matchers.containsString("Invalid display name preference")));
    }

    @Test
    void patchMe_explicitNullOnFirstNameReturns400() throws Exception {
        mvc.perform(patch("/api/v1/users/me")
                .header("Authorization", "Bearer " + validToken)
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"firstName\": null}"))
            .andExpect(status().isBadRequest())
            .andExpect(jsonPath("$.code").value("INVALID_INPUT"));
    }

    @Test
    void patchMe_explicitNullOnDisplayNamePreferenceReturns400() throws Exception {
        // HTTP-layer regression guard paired with OpenAPI schema fix: displayNamePreference
        // is declared non-nullable in the schema; server rejects explicit null with 400.
        mvc.perform(patch("/api/v1/users/me")
                .header("Authorization", "Bearer " + validToken)
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"displayNamePreference\": null}"))
            .andExpect(status().isBadRequest())
            .andExpect(jsonPath("$.code").value("INVALID_INPUT"))
            .andExpect(jsonPath("$.message").value(
                org.hamcrest.Matchers.containsString("displayNamePreference cannot be set to null")));
    }

    @Test
    void patchMe_explicitNullOnTimezoneReturns400() throws Exception {
        // HTTP-layer regression guard paired with OpenAPI schema fix: timezone is
        // declared non-nullable in the schema; server rejects explicit null with 400.
        mvc.perform(patch("/api/v1/users/me")
                .header("Authorization", "Bearer " + validToken)
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"timezone\": null}"))
            .andExpect(status().isBadRequest())
            .andExpect(jsonPath("$.code").value("INVALID_INPUT"))
            .andExpect(jsonPath("$.message").value(
                org.hamcrest.Matchers.containsString("timezone cannot be set to null")));
    }

    // --- PATCH: 400 VALIDATION_FAILED cases ---

    @Test
    void patchMe_bioOver2000CharsReturns400ValidationFailed() throws Exception {
        String longBio = "a".repeat(2001);
        String body = mapper.writeValueAsString(Map.of("bio", longBio));
        mvc.perform(patch("/api/v1/users/me")
                .header("Authorization", "Bearer " + validToken)
                .contentType(MediaType.APPLICATION_JSON).content(body))
            .andExpect(status().isBadRequest())
            .andExpect(jsonPath("$.code").value("VALIDATION_FAILED"))
            .andExpect(jsonPath("$.fieldErrors.bio").exists());
    }

    @Test
    void patchMe_invalidAvatarUrlReturns400ValidationFailed() throws Exception {
        String body = mapper.writeValueAsString(Map.of("avatarUrl", "not-a-url"));
        mvc.perform(patch("/api/v1/users/me")
                .header("Authorization", "Bearer " + validToken)
                .contentType(MediaType.APPLICATION_JSON).content(body))
            .andExpect(status().isBadRequest())
            .andExpect(jsonPath("$.code").value("VALIDATION_FAILED"))
            .andExpect(jsonPath("$.fieldErrors.avatarUrl").exists());
    }

    // --- PATCH: 401 cases ---

    @Test
    void patchMe_withoutTokenReturns401() throws Exception {
        mvc.perform(patch("/api/v1/users/me")
                .contentType(MediaType.APPLICATION_JSON).content("{}"))
            .andExpect(status().isUnauthorized());
    }

    // --- PATCH: privilege escalation attempts (silently dropped by DTO field list) ---

    @Test
    void patchMe_attemptToSetEmailIsSilentlyIgnored() throws Exception {
        // email is NOT a field on UpdateUserRequest. Jackson drops unknown fields by default,
        // so this PATCH succeeds with no email change AND no other field change.
        String body = mapper.writeValueAsString(Map.of("email", "hacker@example.com"));
        mvc.perform(patch("/api/v1/users/me")
                .header("Authorization", "Bearer " + validToken)
                .contentType(MediaType.APPLICATION_JSON).content(body))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data.email").value("me@example.com")); // unchanged

        assertThat(userRepository.findById(seedUser.getId()).orElseThrow().getEmail())
            .isEqualTo("me@example.com");
    }

    @Test
    void patchMe_attemptToSetIsAdminIsSilentlyIgnored() throws Exception {
        String body = mapper.writeValueAsString(Map.of("isAdmin", true));
        mvc.perform(patch("/api/v1/users/me")
                .header("Authorization", "Bearer " + validToken)
                .contentType(MediaType.APPLICATION_JSON).content(body))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data.isAdmin").value(false));

        assertThat(userRepository.findById(seedUser.getId()).orElseThrow().isAdmin()).isFalse();
    }

    @Test
    void patchMe_attemptToSetIsEmailVerifiedIsSilentlyIgnored() throws Exception {
        String body = mapper.writeValueAsString(Map.of("isEmailVerified", true));
        mvc.perform(patch("/api/v1/users/me")
                .header("Authorization", "Bearer " + validToken)
                .contentType(MediaType.APPLICATION_JSON).content(body))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data.isEmailVerified").value(false));
    }

    // --- PATCH: updated_at maintenance ---

    @Test
    void patchMe_updatesUpdatedAt() throws Exception {
        java.time.OffsetDateTime before = seedUser.getUpdatedAt();
        Thread.sleep(10); // ensure measurable gap

        mvc.perform(patch("/api/v1/users/me")
                .header("Authorization", "Bearer " + validToken)
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"bio\": \"new bio\"}"))
            .andExpect(status().isOk());

        assertThat(userRepository.findById(seedUser.getId()).orElseThrow().getUpdatedAt())
            .isAfter(before);
    }
}
