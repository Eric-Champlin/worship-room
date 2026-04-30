package com.worshiproom.auth;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.worshiproom.support.AbstractIntegrationTest;
import com.worshiproom.user.User;
import com.worshiproom.user.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.test.web.servlet.MockMvc;

import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * End-to-end controller tests for POST /api/v1/auth/change-password
 * (Spec 1.5c). Each test creates a fresh user (with a new UUID), so the
 * per-user rate-limit bucket is fresh and tests don't contaminate each other.
 */
@AutoConfigureMockMvc
class AuthControllerChangePasswordTest extends AbstractIntegrationTest {

    private static final String TEST_JWT_SECRET =
        "test-jwt-secret-at-least-32-bytes-long-xxxxxxxxxxxxxx";

    @DynamicPropertySource
    static void properties(DynamicPropertyRegistry registry) {
        registry.add("jwt.secret", () -> TEST_JWT_SECRET);
        // Disable login-side rate-limit interference for clean isolation.
        registry.add("auth.rate-limit.per-email.capacity", () -> "1000");
        registry.add("auth.rate-limit.per-ip.capacity", () -> "10000");
    }

    @Autowired private MockMvc mvc;
    @Autowired private ObjectMapper mapper;
    @Autowired private UserRepository userRepository;
    @Autowired private BCryptPasswordEncoder encoder;
    @Autowired private JwtService jwtService;

    @BeforeEach
    void clean() { userRepository.deleteAll(); }

    @Test
    void post_returns204_onSuccess() throws Exception {
        User user = createUser("ok@example.com", "current-password");
        String token = jwtService.generateToken(user.getId(), false);

        mvc.perform(post("/api/v1/auth/change-password")
                .header("Authorization", "Bearer " + token)
                .contentType(MediaType.APPLICATION_JSON)
                .content(mapper.writeValueAsString(Map.of(
                    "currentPassword", "current-password",
                    "newPassword", "new-password-9876"))))
            .andExpect(status().isNoContent());

        User reloaded = userRepository.findById(user.getId()).orElseThrow();
        assertThat(encoder.matches("new-password-9876", reloaded.getPasswordHash())).isTrue();
    }

    @Test
    void post_returns403_currentPasswordIncorrect() throws Exception {
        // 403 (not 401) by design. See AuthException#currentPasswordIncorrect javadoc:
        // 401 would trigger apiFetch's global token-clear and force-logout the user
        // on a wrong-password attempt. 403 lets the modal surface the inline error
        // without unmounting.
        User user = createUser("wrong-current@example.com", "current-password");
        String token = jwtService.generateToken(user.getId(), false);

        mvc.perform(post("/api/v1/auth/change-password")
                .header("Authorization", "Bearer " + token)
                .contentType(MediaType.APPLICATION_JSON)
                .content(mapper.writeValueAsString(Map.of(
                    "currentPassword", "WRONG-current-password",
                    "newPassword", "new-password-9876"))))
            .andExpect(status().isForbidden())
            .andExpect(jsonPath("$.code").value("CURRENT_PASSWORD_INCORRECT"));
    }

    @Test
    void post_returns400_passwordsMustDiffer() throws Exception {
        User user = createUser("same-pwd@example.com", "current-password");
        String token = jwtService.generateToken(user.getId(), false);

        mvc.perform(post("/api/v1/auth/change-password")
                .header("Authorization", "Bearer " + token)
                .contentType(MediaType.APPLICATION_JSON)
                .content(mapper.writeValueAsString(Map.of(
                    "currentPassword", "current-password",
                    "newPassword", "current-password"))))
            .andExpect(status().isBadRequest())
            .andExpect(jsonPath("$.code").value("PASSWORDS_MUST_DIFFER"));
    }

    @Test
    void post_returns400_newPasswordTooShort() throws Exception {
        User user = createUser("short-new@example.com", "current-password");
        String token = jwtService.generateToken(user.getId(), false);

        mvc.perform(post("/api/v1/auth/change-password")
                .header("Authorization", "Bearer " + token)
                .contentType(MediaType.APPLICATION_JSON)
                .content(mapper.writeValueAsString(Map.of(
                    "currentPassword", "current-password",
                    "newPassword", "short"))))
            .andExpect(status().isBadRequest())
            .andExpect(jsonPath("$.code").value("VALIDATION_FAILED"))
            .andExpect(jsonPath("$.fieldErrors.newPassword").exists());
    }

    @Test
    void post_returns400_newPasswordMissing() throws Exception {
        User user = createUser("missing-new@example.com", "current-password");
        String token = jwtService.generateToken(user.getId(), false);

        mvc.perform(post("/api/v1/auth/change-password")
                .header("Authorization", "Bearer " + token)
                .contentType(MediaType.APPLICATION_JSON)
                .content(mapper.writeValueAsString(Map.of(
                    "currentPassword", "current-password"))))
            .andExpect(status().isBadRequest())
            .andExpect(jsonPath("$.code").value("VALIDATION_FAILED"));
    }

    @Test
    void post_returns400_currentPasswordBlank() throws Exception {
        User user = createUser("blank-current@example.com", "current-password");
        String token = jwtService.generateToken(user.getId(), false);

        mvc.perform(post("/api/v1/auth/change-password")
                .header("Authorization", "Bearer " + token)
                .contentType(MediaType.APPLICATION_JSON)
                .content(mapper.writeValueAsString(Map.of(
                    "currentPassword", "",
                    "newPassword", "new-password-9876"))))
            .andExpect(status().isBadRequest())
            .andExpect(jsonPath("$.code").value("VALIDATION_FAILED"));
    }

    @Test
    void post_returns401_noBearerToken() throws Exception {
        mvc.perform(post("/api/v1/auth/change-password")
                .contentType(MediaType.APPLICATION_JSON)
                .content(mapper.writeValueAsString(Map.of(
                    "currentPassword", "current-password",
                    "newPassword", "new-password-9876"))))
            .andExpect(status().isUnauthorized());
    }

    @Test
    void post_returns401_invalidBearerToken() throws Exception {
        mvc.perform(post("/api/v1/auth/change-password")
                .header("Authorization", "Bearer not.a.real.jwt")
                .contentType(MediaType.APPLICATION_JSON)
                .content(mapper.writeValueAsString(Map.of(
                    "currentPassword", "current-password",
                    "newPassword", "new-password-9876"))))
            .andExpect(status().isUnauthorized());
    }

    @Test
    void post_returns429_afterFifthFailedAttempt() throws Exception {
        // Fresh user → fresh per-user bucket (keyed by UUID).
        User user = createUser("rate-limit@example.com", "current-password");
        String token = jwtService.generateToken(user.getId(), false);

        String wrongCurrentBody = mapper.writeValueAsString(Map.of(
            "currentPassword", "WRONG-current",
            "newPassword", "new-password-9876"));

        // 5 attempts each return 403 (current incorrect) but each consumes a token.
        for (int i = 0; i < 5; i++) {
            mvc.perform(post("/api/v1/auth/change-password")
                    .header("Authorization", "Bearer " + token)
                    .contentType(MediaType.APPLICATION_JSON)
                    .content(wrongCurrentBody))
                .andExpect(status().isForbidden());
        }

        // 6th attempt: rate-limited regardless of payload validity.
        mvc.perform(post("/api/v1/auth/change-password")
                .header("Authorization", "Bearer " + token)
                .contentType(MediaType.APPLICATION_JSON)
                .content(wrongCurrentBody))
            .andExpect(status().isTooManyRequests())
            .andExpect(jsonPath("$.code").value("CHANGE_PASSWORD_RATE_LIMITED"))
            .andExpect(header().exists("Retry-After"));
    }

    @Test
    void post_existingJwtSurvivesSuccessfulChange() throws Exception {
        // Spec 1.5c D4: existing JWTs (current request and other devices) remain
        // valid until natural expiry. Session invalidation is Spec 1.5g territory.
        // This regression test guards against accidental session invalidation —
        // if a future contributor wires logout-all-on-password-change without
        // updating D4 explicitly, this test fails.
        User user = createUser("jwt-survives@example.com", "current-password");
        String token = jwtService.generateToken(user.getId(), false);

        mvc.perform(post("/api/v1/auth/change-password")
                .header("Authorization", "Bearer " + token)
                .contentType(MediaType.APPLICATION_JSON)
                .content(mapper.writeValueAsString(Map.of(
                    "currentPassword", "current-password",
                    "newPassword", "new-password-9876"))))
            .andExpect(status().isNoContent());

        // Same JWT must still authenticate a subsequent request.
        mvc.perform(get("/api/v1/users/me")
                .header("Authorization", "Bearer " + token))
            .andExpect(status().isOk());
    }

    @Test
    void post_postSuccessLogin_newPasswordWorks_oldPasswordFails() throws Exception {
        User user = createUser("rotate-pwd@example.com", "current-password");
        String token = jwtService.generateToken(user.getId(), false);

        mvc.perform(post("/api/v1/auth/change-password")
                .header("Authorization", "Bearer " + token)
                .contentType(MediaType.APPLICATION_JSON)
                .content(mapper.writeValueAsString(Map.of(
                    "currentPassword", "current-password",
                    "newPassword", "new-password-9876"))))
            .andExpect(status().isNoContent());

        // Login with new password succeeds.
        mvc.perform(post("/api/v1/auth/login")
                .contentType(MediaType.APPLICATION_JSON)
                .content(mapper.writeValueAsString(Map.of(
                    "email", "rotate-pwd@example.com",
                    "password", "new-password-9876"))))
            .andExpect(status().isOk());

        // Login with old password fails 401 INVALID_CREDENTIALS.
        mvc.perform(post("/api/v1/auth/login")
                .contentType(MediaType.APPLICATION_JSON)
                .content(mapper.writeValueAsString(Map.of(
                    "email", "rotate-pwd@example.com",
                    "password", "current-password"))))
            .andExpect(status().isUnauthorized())
            .andExpect(jsonPath("$.code").value("INVALID_CREDENTIALS"));
    }

    private User createUser(String email, String plaintextPassword) {
        User user = new User(email, encoder.encode(plaintextPassword), "Test", "User", "UTC");
        return userRepository.save(user);
    }
}
