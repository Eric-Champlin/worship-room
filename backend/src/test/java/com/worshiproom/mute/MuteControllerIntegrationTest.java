package com.worshiproom.mute;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.worshiproom.auth.JwtService;
import com.worshiproom.support.AbstractIntegrationTest;
import com.worshiproom.user.User;
import com.worshiproom.user.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.test.web.servlet.MockMvc;

import java.util.Map;
import java.util.UUID;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@AutoConfigureMockMvc
class MuteControllerIntegrationTest extends AbstractIntegrationTest {

    private static final String TEST_JWT_SECRET =
        "test-jwt-secret-at-least-32-bytes-long-xxxxxxxxxxxxxx";

    @DynamicPropertySource
    static void properties(DynamicPropertyRegistry registry) {
        registry.add("jwt.secret", () -> TEST_JWT_SECRET);
        registry.add("auth.rate-limit.per-email.capacity", () -> "1000");
        registry.add("auth.rate-limit.per-ip.capacity", () -> "10000");
    }

    @Autowired private MockMvc mvc;
    @Autowired private ObjectMapper mapper;
    @Autowired private UserRepository userRepository;
    @Autowired private JwtService jwtService;
    @Autowired private MuteService muteService;

    private User alice;
    private User bob;
    private User carol;
    private String aliceJwt;

    @BeforeEach
    void seed() {
        userRepository.deleteAll();
        alice = userRepository.save(new User("alice@example.com", "$2a$10$x", "Alice", "Anderson", "America/Chicago"));
        bob = userRepository.save(new User("bob@example.com", "$2a$10$x", "Bob", "Bennett", "UTC"));
        carol = userRepository.save(new User("carol@example.com", "$2a$10$x", "Carol", "Chen", "UTC"));
        aliceJwt = jwtService.generateToken(alice.getId(), false);
    }

    // =====================================================================
    // POST /api/v1/mutes
    // =====================================================================

    @Nested
    @DisplayName("POST /api/v1/mutes")
    class PostMute {

        @Test
        void postMute_201_happyPath() throws Exception {
            String body = mapper.writeValueAsString(Map.of("userId", bob.getId().toString()));
            mvc.perform(post("/api/v1/mutes")
                    .header("Authorization", "Bearer " + aliceJwt)
                    .contentType(MediaType.APPLICATION_JSON).content(body))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.data.mutedUserId").value(bob.getId().toString()))
                .andExpect(jsonPath("$.data.mutedAt").exists())
                .andExpect(jsonPath("$.meta.requestId").exists())
                .andExpect(header().doesNotExist("Location"));
        }

        @Test
        void postMute_401_noJwt() throws Exception {
            String body = mapper.writeValueAsString(Map.of("userId", bob.getId().toString()));
            mvc.perform(post("/api/v1/mutes")
                    .contentType(MediaType.APPLICATION_JSON).content(body))
                .andExpect(status().isUnauthorized());
        }

        @Test
        void postMute_400_selfMute() throws Exception {
            String body = mapper.writeValueAsString(Map.of("userId", alice.getId().toString()));
            mvc.perform(post("/api/v1/mutes")
                    .header("Authorization", "Bearer " + aliceJwt)
                    .contentType(MediaType.APPLICATION_JSON).content(body))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("SELF_ACTION_FORBIDDEN"));
        }

        @Test
        void postMute_404_targetMissing() throws Exception {
            String body = mapper.writeValueAsString(Map.of("userId", UUID.randomUUID().toString()));
            mvc.perform(post("/api/v1/mutes")
                    .header("Authorization", "Bearer " + aliceJwt)
                    .contentType(MediaType.APPLICATION_JSON).content(body))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.code").value("USER_NOT_FOUND"));
        }

        @Test
        void postMute_400_missingBody() throws Exception {
            mvc.perform(post("/api/v1/mutes")
                    .header("Authorization", "Bearer " + aliceJwt)
                    .contentType(MediaType.APPLICATION_JSON).content("{}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("INVALID_INPUT"));
        }
    }

    // =====================================================================
    // DELETE /api/v1/mutes/{userId}
    // =====================================================================

    @Nested
    @DisplayName("DELETE /api/v1/mutes/{userId}")
    class DeleteMute {

        @Test
        void deleteMute_204_happyPath() throws Exception {
            muteService.muteUser(alice.getId(), bob.getId());
            mvc.perform(delete("/api/v1/mutes/" + bob.getId())
                    .header("Authorization", "Bearer " + aliceJwt))
                .andExpect(status().isNoContent())
                .andExpect(content().string(""));
        }

        @Test
        void deleteMute_404_notMuted() throws Exception {
            mvc.perform(delete("/api/v1/mutes/" + bob.getId())
                    .header("Authorization", "Bearer " + aliceJwt))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.code").value("NOT_MUTED"));
        }

        @Test
        void deleteMute_401_noJwt() throws Exception {
            mvc.perform(delete("/api/v1/mutes/" + bob.getId()))
                .andExpect(status().isUnauthorized());
        }

        @Test
        void deleteMute_400_malformedUuid() throws Exception {
            mvc.perform(delete("/api/v1/mutes/not-a-uuid")
                    .header("Authorization", "Bearer " + aliceJwt))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("INVALID_INPUT"));
        }
    }

    // =====================================================================
    // GET /api/v1/mutes
    // =====================================================================

    @Nested
    @DisplayName("GET /api/v1/mutes")
    class ListMutes {

        @Test
        void getMutes_200_empty() throws Exception {
            mvc.perform(get("/api/v1/mutes")
                    .header("Authorization", "Bearer " + aliceJwt))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data").isArray())
                .andExpect(jsonPath("$.data").isEmpty())
                .andExpect(jsonPath("$.meta.requestId").exists());
        }

        @Test
        void getMutes_200_populated() throws Exception {
            muteService.muteUser(alice.getId(), bob.getId());
            Thread.sleep(10);
            muteService.muteUser(alice.getId(), carol.getId());

            mvc.perform(get("/api/v1/mutes")
                    .header("Authorization", "Bearer " + aliceJwt))
                .andExpect(status().isOk())
                // Most recent first: Carol then Bob
                .andExpect(jsonPath("$.data[0].userId").value(carol.getId().toString()))
                .andExpect(jsonPath("$.data[0].displayName").value("Carol"))
                .andExpect(jsonPath("$.data[0].mutedAt").exists())
                .andExpect(jsonPath("$.data[1].userId").value(bob.getId().toString()))
                .andExpect(jsonPath("$.data[1].displayName").value("Bob"));
        }

        @Test
        void getMutes_401_noJwt() throws Exception {
            mvc.perform(get("/api/v1/mutes"))
                .andExpect(status().isUnauthorized());
        }
    }
}
