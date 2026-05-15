package com.worshiproom.user;

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

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Spec 6.11b — verifies the {@code PATCH /api/v1/users/me} extension carries
 * the {@code presenceOptedOut} field both on input and output.
 */
@AutoConfigureMockMvc
class UserPresenceOptOutIntegrationTest extends AbstractIntegrationTest {

    private static final String TEST_JWT_SECRET =
            "test-jwt-secret-at-least-32-bytes-long-xxxxxxxxxxxxxx";

    @DynamicPropertySource
    static void properties(DynamicPropertyRegistry registry) {
        registry.add("jwt.secret", () -> TEST_JWT_SECRET);
        registry.add("auth.rate-limit.per-email.capacity", () -> "1000");
        registry.add("auth.rate-limit.per-ip.capacity", () -> "10000");
    }

    @Autowired private MockMvc mvc;
    @Autowired private UserRepository userRepository;
    @Autowired private JwtService jwtService;

    private User user;
    private String token;

    @BeforeEach
    void seed() {
        userRepository.deleteAll();
        user = userRepository.save(new User("optout@example.com", "$2a$10$x",
                "Pat", "Person", "UTC"));
        token = jwtService.generateToken(user.getId(), false);
    }

    @Test
    void getMeIncludesPresenceOptedOutFalseByDefault() throws Exception {
        mvc.perform(get("/api/v1/users/me").header("Authorization", "Bearer " + token))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data.presenceOptedOut").value(false));
    }

    @Test
    void patchSetsPresenceOptedOutTrue() throws Exception {
        mvc.perform(patch("/api/v1/users/me")
                .header("Authorization", "Bearer " + token)
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"presenceOptedOut\": true}"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data.presenceOptedOut").value(true));

        User reloaded = userRepository.findById(user.getId()).orElseThrow();
        assertThat(reloaded.isPresenceOptedOut()).isTrue();
    }

    @Test
    void patchCanFlipBackToFalse() throws Exception {
        user.setPresenceOptedOut(true);
        userRepository.save(user);

        mvc.perform(patch("/api/v1/users/me")
                .header("Authorization", "Bearer " + token)
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"presenceOptedOut\": false}"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data.presenceOptedOut").value(false));

        User reloaded = userRepository.findById(user.getId()).orElseThrow();
        assertThat(reloaded.isPresenceOptedOut()).isFalse();
    }

    @Test
    void patchWithoutFieldDoesNotMutate() throws Exception {
        user.setPresenceOptedOut(true);
        userRepository.save(user);

        mvc.perform(patch("/api/v1/users/me")
                .header("Authorization", "Bearer " + token)
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"firstName\": \"Newname\"}"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data.firstName").value("Newname"))
            .andExpect(jsonPath("$.data.presenceOptedOut").value(true));

        User reloaded = userRepository.findById(user.getId()).orElseThrow();
        assertThat(reloaded.isPresenceOptedOut()).isTrue();
    }
}
