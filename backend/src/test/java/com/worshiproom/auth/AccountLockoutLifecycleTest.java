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

import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * End-to-end Spec 1.5f tests covering the full lifecycle: 5 wrong attempts
 * trigger lockout, locked + wrong password keeps returning 401 (anti-enumeration),
 * locked + correct password returns 423 with Retry-After, post-lock-expiry
 * correct password succeeds and resets state.
 */
@AutoConfigureMockMvc
class AccountLockoutLifecycleTest extends AbstractIntegrationTest {

    private static final String TEST_JWT_SECRET =
        "test-jwt-secret-at-least-32-bytes-long-xxxxxxxxxxxxxx";

    @DynamicPropertySource
    static void properties(DynamicPropertyRegistry registry) {
        registry.add("jwt.secret", () -> TEST_JWT_SECRET);
        // Disable in-memory rate-limit interference so we can test lockout in isolation.
        registry.add("auth.rate-limit.per-email.capacity", () -> "1000");
        registry.add("auth.rate-limit.per-ip.capacity", () -> "10000");
    }

    @Autowired private MockMvc mvc;
    @Autowired private ObjectMapper mapper;
    @Autowired private UserRepository userRepository;
    @Autowired private BCryptPasswordEncoder encoder;

    @BeforeEach
    void clean() { userRepository.deleteAll(); }

    @Test
    void fiveWrongPasswordsLocksAccountSixthAttemptCorrectGets423() throws Exception {
        createUser("locktest@example.com", "correctpassword99");

        for (int i = 0; i < 5; i++) {
            mvc.perform(post("/api/v1/auth/login")
                    .contentType(MediaType.APPLICATION_JSON)
                    .content(mapper.writeValueAsString(Map.of(
                        "email", "locktest@example.com",
                        "password", "wrongpassword" + i))))
                .andExpect(status().isUnauthorized());
        }

        mvc.perform(post("/api/v1/auth/login")
                .contentType(MediaType.APPLICATION_JSON)
                .content(mapper.writeValueAsString(Map.of(
                    "email", "locktest@example.com",
                    "password", "correctpassword99"))))
            .andExpect(status().isLocked())
            .andExpect(jsonPath("$.code").value("ACCOUNT_LOCKED"))
            .andExpect(jsonPath("$.message").exists())
            .andExpect(header().exists("Retry-After"));

        User reloaded = userRepository.findByEmailIgnoreCase("locktest@example.com").orElseThrow();
        // Exactly 5 — the 6th attempt with the correct password short-circuits to 423
        // BEFORE recordFailedAttempt fires, so the counter must not advance past 5.
        // Catches a regression where the correct-password path accidentally increments.
        assertThat(reloaded.getFailedLoginCount()).isEqualTo(5);
        assertThat(reloaded.getLockedUntil()).isAfter(OffsetDateTime.now(ZoneOffset.UTC));
    }

    @Test
    void lockedAccountWithWrongPasswordReturns401NotLocked() throws Exception {
        User user = createUser("anti-enum@example.com", "correctpassword99");
        user.setFailedLoginCount(5);
        user.setLockedUntil(OffsetDateTime.now(ZoneOffset.UTC).plusMinutes(15));
        userRepository.save(user);

        mvc.perform(post("/api/v1/auth/login")
                .contentType(MediaType.APPLICATION_JSON)
                .content(mapper.writeValueAsString(Map.of(
                    "email", "anti-enum@example.com",
                    "password", "wrongpassword"))))
            .andExpect(status().isUnauthorized())
            .andExpect(jsonPath("$.code").value("INVALID_CREDENTIALS"))
            .andExpect(header().doesNotExist("Retry-After"));
    }

    @Test
    void postLockExpiryCorrectPasswordSucceedsAndResetsState() throws Exception {
        User user = createUser("expired@example.com", "correctpassword99");
        user.setFailedLoginCount(5);
        user.setFailedLoginWindowStart(OffsetDateTime.now(ZoneOffset.UTC).minusMinutes(20));
        user.setLockedUntil(OffsetDateTime.now(ZoneOffset.UTC).minusMinutes(1));
        userRepository.save(user);

        mvc.perform(post("/api/v1/auth/login")
                .contentType(MediaType.APPLICATION_JSON)
                .content(mapper.writeValueAsString(Map.of(
                    "email", "expired@example.com",
                    "password", "correctpassword99"))))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data.token").exists());

        User reloaded = userRepository.findByEmailIgnoreCase("expired@example.com").orElseThrow();
        assertThat(reloaded.getFailedLoginCount()).isEqualTo(0);
        assertThat(reloaded.getFailedLoginWindowStart()).isNull();
        assertThat(reloaded.getLockedUntil()).isNull();
    }

    private User createUser(String email, String password) {
        User user = new User(email, encoder.encode(password), "Test", "User", "UTC");
        return userRepository.save(user);
    }
}
