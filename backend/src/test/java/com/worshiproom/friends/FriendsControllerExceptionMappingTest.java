package com.worshiproom.friends;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.worshiproom.auth.JwtService;
import com.worshiproom.support.AbstractIntegrationTest;
import com.worshiproom.user.User;
import com.worshiproom.user.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.test.web.servlet.MockMvc;

import java.util.UUID;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@AutoConfigureMockMvc
class FriendsControllerExceptionMappingTest extends AbstractIntegrationTest {

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
    @Autowired private FriendsService friendsService;
    @Autowired private JwtService jwtService;

    private User alice;
    private User bob;
    private String aliceJwt;

    @BeforeEach
    void seed() {
        userRepository.deleteAll();
        alice = userRepository.save(new User("alice@example.com", "$2a$10$x", "Alice", "Anderson", "UTC"));
        bob = userRepository.save(new User("bob@example.com", "$2a$10$x", "Bob", "Bennett", "UTC"));
        aliceJwt = jwtService.generateToken(alice.getId(), false);
    }

    private String body(java.util.Map<String, Object> map) throws Exception {
        return mapper.writeValueAsString(map);
    }

    // ----- 400 — friends-domain client errors -----

    @Test
    void selfActionException_returns400_withSelfActionForbidden() throws Exception {
        // Block self → SelfActionException
        mvc.perform(post("/api/v1/users/me/blocks")
                .header("Authorization", "Bearer " + aliceJwt)
                .contentType(MediaType.APPLICATION_JSON)
                .content(body(java.util.Map.of("userId", alice.getId().toString()))))
            .andExpect(status().isBadRequest())
            .andExpect(jsonPath("$.code").value("SELF_ACTION_FORBIDDEN"))
            .andExpect(jsonPath("$.requestId").exists());
    }

    @Test
    void invalidInputException_returns400_withInvalidInput() throws Exception {
        // Search query < 2 chars → InvalidInputException
        mvc.perform(get("/api/v1/users/search?q=a")
                .header("Authorization", "Bearer " + aliceJwt))
            .andExpect(status().isBadRequest())
            .andExpect(jsonPath("$.code").value("INVALID_INPUT"));
    }

    // ----- 403 — auth/permission errors -----

    @Test
    void blockedUserException_returns403_withBlockedUser() throws Exception {
        // Bob blocks Alice; Alice tries to send Bob a friend request → BlockedUserException
        friendsService.blockUser(bob.getId(), alice.getId());
        mvc.perform(post("/api/v1/users/me/friend-requests")
                .header("Authorization", "Bearer " + aliceJwt)
                .contentType(MediaType.APPLICATION_JSON)
                .content(body(java.util.Map.of("toUserId", bob.getId().toString()))))
            .andExpect(status().isForbidden())
            .andExpect(jsonPath("$.code").value("BLOCKED_USER"));
    }

    @Test
    void unauthorizedActionException_returns403_withUnauthorizedAction() throws Exception {
        // Alice sends Bob a request; Alice (the sender) tries to accept her own request
        // (only the recipient may accept) → UnauthorizedActionException
        UUID requestId = friendsService.sendRequest(alice.getId(), bob.getId(), null).getId();
        mvc.perform(patch("/api/v1/friend-requests/" + requestId)
                .header("Authorization", "Bearer " + aliceJwt) // Alice is sender, not recipient
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"action\":\"accept\"}"))
            .andExpect(status().isForbidden())
            .andExpect(jsonPath("$.code").value("UNAUTHORIZED_ACTION"));
    }

    // ----- 404 — not-found errors -----

    @Test
    void userNotFoundException_returns404_withUserNotFound() throws Exception {
        // Send request to nonexistent user
        mvc.perform(post("/api/v1/users/me/friend-requests")
                .header("Authorization", "Bearer " + aliceJwt)
                .contentType(MediaType.APPLICATION_JSON)
                .content(body(java.util.Map.of("toUserId", UUID.randomUUID().toString()))))
            .andExpect(status().isNotFound())
            .andExpect(jsonPath("$.code").value("USER_NOT_FOUND"));
    }

    @Test
    void friendRequestNotFoundException_returns404() throws Exception {
        // PATCH a non-existent request
        mvc.perform(patch("/api/v1/friend-requests/" + UUID.randomUUID())
                .header("Authorization", "Bearer " + aliceJwt)
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"action\":\"accept\"}"))
            .andExpect(status().isNotFound())
            .andExpect(jsonPath("$.code").value("FRIEND_REQUEST_NOT_FOUND"));
    }

    @Test
    void notFriendsException_returns404_withNotFriends() throws Exception {
        // DELETE a friend who isn't actually a friend
        mvc.perform(delete("/api/v1/users/me/friends/" + bob.getId())
                .header("Authorization", "Bearer " + aliceJwt))
            .andExpect(status().isNotFound())
            .andExpect(jsonPath("$.code").value("NOT_FRIENDS"));
    }

    @Test
    void notBlockedException_returns404_withNotBlocked() throws Exception {
        // DELETE a block that isn't there
        mvc.perform(delete("/api/v1/users/me/blocks/" + bob.getId())
                .header("Authorization", "Bearer " + aliceJwt))
            .andExpect(status().isNotFound())
            .andExpect(jsonPath("$.code").value("NOT_BLOCKED"));
    }

    // ----- 409 — state conflicts -----

    @Test
    void alreadyFriendsException_returns409() throws Exception {
        UUID r = friendsService.sendRequest(alice.getId(), bob.getId(), null).getId();
        friendsService.acceptRequest(r, bob.getId());
        // Alice tries to send another request — friendship already active
        mvc.perform(post("/api/v1/users/me/friend-requests")
                .header("Authorization", "Bearer " + aliceJwt)
                .contentType(MediaType.APPLICATION_JSON)
                .content(body(java.util.Map.of("toUserId", bob.getId().toString()))))
            .andExpect(status().isConflict())
            .andExpect(jsonPath("$.code").value("ALREADY_FRIENDS"));
    }

    @Test
    void duplicateFriendRequestException_returns409() throws Exception {
        // Alice sends two pending requests to Bob — UNIQUE constraint violation
        friendsService.sendRequest(alice.getId(), bob.getId(), null);
        mvc.perform(post("/api/v1/users/me/friend-requests")
                .header("Authorization", "Bearer " + aliceJwt)
                .contentType(MediaType.APPLICATION_JSON)
                .content(body(java.util.Map.of("toUserId", bob.getId().toString()))))
            .andExpect(status().isConflict())
            .andExpect(jsonPath("$.code").value("DUPLICATE_FRIEND_REQUEST"));
    }

    @Test
    void invalidRequestStateException_returns409() throws Exception {
        // Bob accepts the request, then Alice tries to cancel — request no longer pending
        UUID r = friendsService.sendRequest(alice.getId(), bob.getId(), null).getId();
        friendsService.acceptRequest(r, bob.getId());
        mvc.perform(patch("/api/v1/friend-requests/" + r)
                .header("Authorization", "Bearer " + aliceJwt)
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"action\":\"cancel\"}"))
            .andExpect(status().isConflict())
            .andExpect(jsonPath("$.code").value("INVALID_REQUEST_STATE"));
    }

    // ----- Cross-cutting — every error response carries the requestId -----

    @Test
    void allFriendsErrorResponses_carryRequestId() throws Exception {
        mvc.perform(post("/api/v1/users/me/friend-requests")
                .header("Authorization", "Bearer " + aliceJwt)
                .contentType(MediaType.APPLICATION_JSON)
                .content("{}"))
            .andExpect(status().isBadRequest())
            .andExpect(jsonPath("$.code").value("INVALID_INPUT"))
            .andExpect(jsonPath("$.requestId").exists())
            .andExpect(jsonPath("$.timestamp").exists());
    }
}
