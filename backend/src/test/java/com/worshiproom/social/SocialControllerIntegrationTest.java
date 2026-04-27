package com.worshiproom.social;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.worshiproom.auth.JwtService;
import com.worshiproom.friends.FriendRelationshipStatus;
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
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.test.web.servlet.MockMvc;

import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.Map;
import java.util.UUID;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@AutoConfigureMockMvc
class SocialControllerIntegrationTest extends AbstractIntegrationTest {

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
    @Autowired private JdbcTemplate jdbc;

    private User alice;
    private User bob;
    private User carol;
    private String aliceJwt;

    @BeforeEach
    void seed() {
        userRepository.deleteAll();
        alice = userRepository.save(new User("alice-sct@example.com", "$2a$10$x", "Alice", "Anderson", "UTC"));
        bob = userRepository.save(new User("bob-sct@example.com", "$2a$10$x", "Bob", "Bennett", "UTC"));
        carol = userRepository.save(new User("carol-sct@example.com", "$2a$10$x", "Carol", "Chen", "UTC"));
        aliceJwt = jwtService.generateToken(alice.getId(), false);
        // Make alice <-> bob active friends
        jdbc.update(
            "INSERT INTO friend_relationships (user_id, friend_user_id, status) VALUES (?, ?, ?)",
            alice.getId(), bob.getId(), FriendRelationshipStatus.ACTIVE.value());
        jdbc.update(
            "INSERT INTO friend_relationships (user_id, friend_user_id, status) VALUES (?, ?, ?)",
            bob.getId(), alice.getId(), FriendRelationshipStatus.ACTIVE.value());
    }

    @Nested
    @DisplayName("POST /api/v1/social/encouragements")
    class Encouragements {

        @Test
        void happyPath_returns201() throws Exception {
            String body = mapper.writeValueAsString(Map.of(
                "toUserId", bob.getId().toString(),
                "message", "Praying for you."));
            mvc.perform(post("/api/v1/social/encouragements")
                    .header("Authorization", "Bearer " + aliceJwt)
                    .contentType(MediaType.APPLICATION_JSON)
                    .content(body))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.data.id").exists())
                .andExpect(jsonPath("$.data.createdAt").exists())
                .andExpect(jsonPath("$.meta.requestId").exists());
        }

        @Test
        void withoutToken_returns401() throws Exception {
            String body = mapper.writeValueAsString(Map.of(
                "toUserId", bob.getId().toString(),
                "message", "Hi"));
            mvc.perform(post("/api/v1/social/encouragements")
                    .contentType(MediaType.APPLICATION_JSON)
                    .content(body))
                .andExpect(status().isUnauthorized());
        }

        @Test
        void missingMessage_returns400InvalidInput() throws Exception {
            String body = mapper.writeValueAsString(Map.of(
                "toUserId", bob.getId().toString()));
            mvc.perform(post("/api/v1/social/encouragements")
                    .header("Authorization", "Bearer " + aliceJwt)
                    .contentType(MediaType.APPLICATION_JSON)
                    .content(body))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("INVALID_INPUT"));
        }

        @Test
        void messageOver200Chars_returns400InvalidInput() throws Exception {
            String tooLong = "x".repeat(201);
            String body = mapper.writeValueAsString(Map.of(
                "toUserId", bob.getId().toString(),
                "message", tooLong));
            mvc.perform(post("/api/v1/social/encouragements")
                    .header("Authorization", "Bearer " + aliceJwt)
                    .contentType(MediaType.APPLICATION_JSON)
                    .content(body))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("INVALID_INPUT"));
        }

        @Test
        void nonFriendRecipient_returns403NotFriends() throws Exception {
            // alice <-> carol have no friendship
            String body = mapper.writeValueAsString(Map.of(
                "toUserId", carol.getId().toString(),
                "message", "Hi"));
            mvc.perform(post("/api/v1/social/encouragements")
                    .header("Authorization", "Bearer " + aliceJwt)
                    .contentType(MediaType.APPLICATION_JSON)
                    .content(body))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.code").value("NOT_FRIENDS"));
        }
    }

    @Nested
    @DisplayName("POST /api/v1/social/nudges")
    class Nudges {

        @Test
        void happyPath_returns201() throws Exception {
            String body = mapper.writeValueAsString(Map.of(
                "toUserId", bob.getId().toString()));
            mvc.perform(post("/api/v1/social/nudges")
                    .header("Authorization", "Bearer " + aliceJwt)
                    .contentType(MediaType.APPLICATION_JSON)
                    .content(body))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.data.id").exists())
                .andExpect(jsonPath("$.data.createdAt").exists());
        }

        @Test
        void activeCooldown_returns409NudgeCooldown() throws Exception {
            // Seed nudge 3 days ago (cooldown = 7 days, so still active).
            OffsetDateTime threeDaysAgo = OffsetDateTime.now(ZoneOffset.UTC).minusDays(3);
            jdbc.update(
                "INSERT INTO social_interactions "
              + "(id, from_user_id, to_user_id, interaction_type, payload, created_at) "
              + "VALUES (?, ?, ?, 'nudge', NULL, ?)",
                UUID.randomUUID(), alice.getId(), bob.getId(), threeDaysAgo);

            String body = mapper.writeValueAsString(Map.of(
                "toUserId", bob.getId().toString()));
            mvc.perform(post("/api/v1/social/nudges")
                    .header("Authorization", "Bearer " + aliceJwt)
                    .contentType(MediaType.APPLICATION_JSON)
                    .content(body))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.code").value("NUDGE_COOLDOWN"));
        }

        @Test
        void missingToUserId_returns400InvalidInput() throws Exception {
            String body = "{}";
            mvc.perform(post("/api/v1/social/nudges")
                    .header("Authorization", "Bearer " + aliceJwt)
                    .contentType(MediaType.APPLICATION_JSON)
                    .content(body))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("INVALID_INPUT"));
        }
    }

    @Nested
    @DisplayName("POST /api/v1/social/recap-dismissal")
    class RecapDismissal {

        @Test
        void happyPath_returns201() throws Exception {
            String body = mapper.writeValueAsString(Map.of(
                "weekStart", "2026-04-21"));
            mvc.perform(post("/api/v1/social/recap-dismissal")
                    .header("Authorization", "Bearer " + aliceJwt)
                    .contentType(MediaType.APPLICATION_JSON)
                    .content(body))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.data.id").exists())
                .andExpect(jsonPath("$.data.createdAt").exists());
        }

        @Test
        void badDateFormat_returns400InvalidInput() throws Exception {
            String body = mapper.writeValueAsString(Map.of(
                "weekStart", "not-a-date"));
            mvc.perform(post("/api/v1/social/recap-dismissal")
                    .header("Authorization", "Bearer " + aliceJwt)
                    .contentType(MediaType.APPLICATION_JSON)
                    .content(body))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("INVALID_INPUT"));
        }
    }
}
