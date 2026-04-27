package com.worshiproom.friends;

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
import org.springframework.test.web.servlet.MvcResult;

import java.util.UUID;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@AutoConfigureMockMvc
class FriendsControllerIntegrationTest extends AbstractIntegrationTest {

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
    @Autowired private FriendsService friendsService;

    private User alice;
    private User bob;
    private String aliceJwt;
    private String bobJwt;

    @BeforeEach
    void seed() {
        userRepository.deleteAll();
        alice = userRepository.save(new User("alice@example.com", "$2a$10$x", "Alice", "Anderson", "America/Chicago"));
        bob = userRepository.save(new User("bob@example.com", "$2a$10$x", "Bob", "Bennett", "UTC"));
        userRepository.save(new User("carol@example.com", "$2a$10$x", "Carol", "Chen", "UTC"));
        aliceJwt = jwtService.generateToken(alice.getId(), false);
        bobJwt = jwtService.generateToken(bob.getId(), false);
    }

    // ==========================================================
    // 1. GET /api/v1/users/me/friends — list friends
    // ==========================================================

    @Nested
    @DisplayName("GET /api/v1/users/me/friends")
    class ListFriends {

        @Test
        void emptyList_returns200WithEmptyArray() throws Exception {
            mvc.perform(get("/api/v1/users/me/friends")
                    .header("Authorization", "Bearer " + aliceJwt))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data").isArray())
                .andExpect(jsonPath("$.data").isEmpty())
                .andExpect(jsonPath("$.meta.requestId").exists());
        }

        @Test
        void withFriends_returnsDenormalizedFriendDtos() throws Exception {
            UUID requestId = friendsService.sendRequest(alice.getId(), bob.getId(), "hi").getId();
            friendsService.acceptRequest(requestId, bob.getId());
            mvc.perform(get("/api/v1/users/me/friends")
                    .header("Authorization", "Bearer " + aliceJwt))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data[0].id").value(bob.getId().toString()))
                .andExpect(jsonPath("$.data[0].displayName").value("Bob"))
                .andExpect(jsonPath("$.data[0].levelName").exists())
                .andExpect(jsonPath("$.data[0].weeklyPoints").exists());
        }

        @Test
        void withoutToken_returns401() throws Exception {
            mvc.perform(get("/api/v1/users/me/friends"))
                .andExpect(status().isUnauthorized());
        }
    }

    // ==========================================================
    // 2. GET /api/v1/users/me/friend-requests
    // ==========================================================

    @Nested
    @DisplayName("GET /api/v1/users/me/friend-requests")
    class ListFriendRequests {

        @Test
        void incoming_emptyReturns200() throws Exception {
            mvc.perform(get("/api/v1/users/me/friend-requests?direction=incoming")
                    .header("Authorization", "Bearer " + aliceJwt))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data").isArray())
                .andExpect(jsonPath("$.data").isEmpty());
        }

        @Test
        void incoming_withPending_returnsList() throws Exception {
            friendsService.sendRequest(alice.getId(), bob.getId(), "Hey");
            mvc.perform(get("/api/v1/users/me/friend-requests?direction=incoming")
                    .header("Authorization", "Bearer " + bobJwt))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data[0].fromUserId").value(alice.getId().toString()))
                .andExpect(jsonPath("$.data[0].status").value("pending"));
        }

        @Test
        void outgoing_withPending_returnsList() throws Exception {
            friendsService.sendRequest(alice.getId(), bob.getId(), "Hey");
            mvc.perform(get("/api/v1/users/me/friend-requests?direction=outgoing")
                    .header("Authorization", "Bearer " + aliceJwt))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data[0].toUserId").value(bob.getId().toString()));
        }

        @Test
        void missingDirection_returns400InvalidInput() throws Exception {
            mvc.perform(get("/api/v1/users/me/friend-requests")
                    .header("Authorization", "Bearer " + aliceJwt))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("INVALID_INPUT"));
        }

        @Test
        void invalidDirection_returns400InvalidInput() throws Exception {
            mvc.perform(get("/api/v1/users/me/friend-requests?direction=foo")
                    .header("Authorization", "Bearer " + aliceJwt))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("INVALID_INPUT"));
        }
    }

    // ==========================================================
    // 3. POST /api/v1/users/me/friend-requests
    // ==========================================================

    @Nested
    @DisplayName("POST /api/v1/users/me/friend-requests")
    class SendFriendRequest {

        @Test
        void happyPath_returns201WithLocationHeader() throws Exception {
            String body = mapper.writeValueAsString(java.util.Map.of(
                "toUserId", bob.getId().toString(),
                "message", "Hello!"));
            MvcResult result = mvc.perform(post("/api/v1/users/me/friend-requests")
                    .header("Authorization", "Bearer " + aliceJwt)
                    .contentType(MediaType.APPLICATION_JSON).content(body))
                .andExpect(status().isCreated())
                .andExpect(header().exists("Location"))
                .andExpect(jsonPath("$.data.fromUserId").value(alice.getId().toString()))
                .andExpect(jsonPath("$.data.toUserId").value(bob.getId().toString()))
                .andExpect(jsonPath("$.data.status").value("pending"))
                .andReturn();
            String location = result.getResponse().getHeader("Location");
            org.assertj.core.api.Assertions.assertThat(location)
                .startsWith("/api/v1/friend-requests/");
        }

        @Test
        void missingToUserId_returns400InvalidInputWithFieldError() throws Exception {
            mvc.perform(post("/api/v1/users/me/friend-requests")
                    .header("Authorization", "Bearer " + aliceJwt)
                    .contentType(MediaType.APPLICATION_JSON).content("{}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("INVALID_INPUT"))
                .andExpect(jsonPath("$.fieldErrors.toUserId").exists());
        }

        @Test
        void messageOver280Chars_returns400InvalidInput() throws Exception {
            String body = mapper.writeValueAsString(java.util.Map.of(
                "toUserId", bob.getId().toString(),
                "message", "a".repeat(281)));
            mvc.perform(post("/api/v1/users/me/friend-requests")
                    .header("Authorization", "Bearer " + aliceJwt)
                    .contentType(MediaType.APPLICATION_JSON).content(body))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("INVALID_INPUT"))
                .andExpect(jsonPath("$.fieldErrors.message").exists());
        }
    }

    // ==========================================================
    // 4. PATCH /api/v1/friend-requests/{id} — action dispatch
    // ==========================================================

    @Nested
    @DisplayName("PATCH /api/v1/friend-requests/{id}")
    class RespondToFriendRequest {

        private UUID pendingRequestId;

        @BeforeEach
        void seedRequest() {
            pendingRequestId = friendsService.sendRequest(alice.getId(), bob.getId(), null).getId();
        }

        @Test
        void accept_returns200WithStatusAccepted() throws Exception {
            mvc.perform(patch("/api/v1/friend-requests/" + pendingRequestId)
                    .header("Authorization", "Bearer " + bobJwt)
                    .contentType(MediaType.APPLICATION_JSON)
                    .content("{\"action\":\"accept\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.status").value("accepted"));
        }

        @Test
        void decline_returns200WithStatusDeclined() throws Exception {
            mvc.perform(patch("/api/v1/friend-requests/" + pendingRequestId)
                    .header("Authorization", "Bearer " + bobJwt)
                    .contentType(MediaType.APPLICATION_JSON)
                    .content("{\"action\":\"decline\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.status").value("declined"));
        }

        @Test
        void cancel_returns200WithStatusCancelled() throws Exception {
            mvc.perform(patch("/api/v1/friend-requests/" + pendingRequestId)
                    .header("Authorization", "Bearer " + aliceJwt)
                    .contentType(MediaType.APPLICATION_JSON)
                    .content("{\"action\":\"cancel\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.status").value("cancelled"));
        }

        @Test
        void invalidAction_returns400InvalidInput() throws Exception {
            mvc.perform(patch("/api/v1/friend-requests/" + pendingRequestId)
                    .header("Authorization", "Bearer " + bobJwt)
                    .contentType(MediaType.APPLICATION_JSON)
                    .content("{\"action\":\"frobnicate\"}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("INVALID_INPUT"));
        }

        @Test
        void missingAction_returns400InvalidInput() throws Exception {
            mvc.perform(patch("/api/v1/friend-requests/" + pendingRequestId)
                    .header("Authorization", "Bearer " + bobJwt)
                    .contentType(MediaType.APPLICATION_JSON).content("{}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("INVALID_INPUT"));
        }
    }

    // ==========================================================
    // 5. DELETE /api/v1/users/me/friends/{friendId}
    // ==========================================================

    @Nested
    @DisplayName("DELETE /api/v1/users/me/friends/{friendId}")
    class RemoveFriend {

        @Test
        void happyPath_returns204NoBody() throws Exception {
            UUID requestId = friendsService.sendRequest(alice.getId(), bob.getId(), null).getId();
            friendsService.acceptRequest(requestId, bob.getId());
            mvc.perform(delete("/api/v1/users/me/friends/" + bob.getId())
                    .header("Authorization", "Bearer " + aliceJwt))
                .andExpect(status().isNoContent())
                .andExpect(content().string(""));
        }
    }

    // ==========================================================
    // 6 & 7. POST/DELETE /api/v1/users/me/blocks/...
    // ==========================================================

    @Nested
    @DisplayName("/api/v1/users/me/blocks")
    class Blocks {

        @Test
        void postBlocks_returns201WithBody() throws Exception {
            String body = mapper.writeValueAsString(java.util.Map.of(
                "userId", bob.getId().toString()));
            mvc.perform(post("/api/v1/users/me/blocks")
                    .header("Authorization", "Bearer " + aliceJwt)
                    .contentType(MediaType.APPLICATION_JSON).content(body))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.data.blockedUserId").value(bob.getId().toString()))
                .andExpect(jsonPath("$.data.blockedAt").exists())
                .andExpect(header().doesNotExist("Location"));
        }

        @Test
        void postBlocks_missingUserId_returns400() throws Exception {
            mvc.perform(post("/api/v1/users/me/blocks")
                    .header("Authorization", "Bearer " + aliceJwt)
                    .contentType(MediaType.APPLICATION_JSON).content("{}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("INVALID_INPUT"));
        }

        @Test
        void deleteBlock_returns204() throws Exception {
            friendsService.blockUser(alice.getId(), bob.getId());
            mvc.perform(delete("/api/v1/users/me/blocks/" + bob.getId())
                    .header("Authorization", "Bearer " + aliceJwt))
                .andExpect(status().isNoContent())
                .andExpect(content().string(""));
        }
    }

    // ==========================================================
    // 8. GET /api/v1/users/search (cross-package — D-Advice)
    // ==========================================================

    @Nested
    @DisplayName("GET /api/v1/users/search")
    class SearchUsers {

        @Test
        void happyPath_returns200WithResults() throws Exception {
            mvc.perform(get("/api/v1/users/search?q=Bo&limit=10")
                    .header("Authorization", "Bearer " + aliceJwt))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data[0].id").value(bob.getId().toString()))
                .andExpect(jsonPath("$.data[0].displayName").value("Bob"));
        }

        /**
         * Verifies D-Advice: friends-domain InvalidInputException thrown from
         * UserController.search (com.worshiproom.user package) is caught by the
         * UNSCOPED FriendsExceptionHandler (com.worshiproom.friends package).
         * If this test fails, FriendsExceptionHandler likely has basePackages set.
         */
        @Test
        void shortQuery_caughtByUnscopedFriendsAdvice() throws Exception {
            mvc.perform(get("/api/v1/users/search?q=a")
                    .header("Authorization", "Bearer " + aliceJwt))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("INVALID_INPUT"));
        }

        @Test
        void missingQ_returns400() throws Exception {
            mvc.perform(get("/api/v1/users/search")
                    .header("Authorization", "Bearer " + aliceJwt))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("INVALID_INPUT"));
        }
    }

    // ==========================================================
    // Auth gating (parameterized — single test for all 8 endpoints)
    // ==========================================================

    @Nested
    @DisplayName("Auth gating")
    class AuthGating {

        @Test
        void allEndpoints_returnUnauthorizedWithoutToken() throws Exception {
            mvc.perform(get("/api/v1/users/me/friends")).andExpect(status().isUnauthorized());
            mvc.perform(get("/api/v1/users/me/friend-requests?direction=incoming")).andExpect(status().isUnauthorized());
            mvc.perform(post("/api/v1/users/me/friend-requests")
                .contentType(MediaType.APPLICATION_JSON).content("{}")).andExpect(status().isUnauthorized());
            mvc.perform(patch("/api/v1/friend-requests/" + UUID.randomUUID())
                .contentType(MediaType.APPLICATION_JSON).content("{}")).andExpect(status().isUnauthorized());
            mvc.perform(delete("/api/v1/users/me/friends/" + UUID.randomUUID())).andExpect(status().isUnauthorized());
            mvc.perform(post("/api/v1/users/me/blocks")
                .contentType(MediaType.APPLICATION_JSON).content("{}")).andExpect(status().isUnauthorized());
            mvc.perform(delete("/api/v1/users/me/blocks/" + UUID.randomUUID())).andExpect(status().isUnauthorized());
            mvc.perform(get("/api/v1/users/search?q=ali")).andExpect(status().isUnauthorized());
        }

        @Test
        void allEndpoints_returnUnauthorizedWithGarbageToken() throws Exception {
            String garbage = "Bearer not-a-real-token";
            mvc.perform(get("/api/v1/users/me/friends").header("Authorization", garbage))
                .andExpect(status().isUnauthorized());
            mvc.perform(get("/api/v1/users/me/friend-requests?direction=incoming").header("Authorization", garbage))
                .andExpect(status().isUnauthorized());
            mvc.perform(post("/api/v1/users/me/friend-requests")
                    .header("Authorization", garbage)
                    .contentType(MediaType.APPLICATION_JSON).content("{}"))
                .andExpect(status().isUnauthorized());
            mvc.perform(patch("/api/v1/friend-requests/" + UUID.randomUUID())
                    .header("Authorization", garbage)
                    .contentType(MediaType.APPLICATION_JSON).content("{}"))
                .andExpect(status().isUnauthorized());
            mvc.perform(delete("/api/v1/users/me/friends/" + UUID.randomUUID())
                    .header("Authorization", garbage))
                .andExpect(status().isUnauthorized());
            mvc.perform(post("/api/v1/users/me/blocks")
                    .header("Authorization", garbage)
                    .contentType(MediaType.APPLICATION_JSON).content("{}"))
                .andExpect(status().isUnauthorized());
            mvc.perform(delete("/api/v1/users/me/blocks/" + UUID.randomUUID())
                    .header("Authorization", garbage))
                .andExpect(status().isUnauthorized());
            mvc.perform(get("/api/v1/users/search?q=ali").header("Authorization", garbage))
                .andExpect(status().isUnauthorized());
        }
    }
}
