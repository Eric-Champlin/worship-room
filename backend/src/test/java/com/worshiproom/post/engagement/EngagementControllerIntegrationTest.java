package com.worshiproom.post.engagement;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.worshiproom.auth.JwtService;
import com.worshiproom.post.PostRepository;
import com.worshiproom.support.AbstractIntegrationTest;
import com.worshiproom.user.User;
import com.worshiproom.user.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;

import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@AutoConfigureMockMvc
class EngagementControllerIntegrationTest extends AbstractIntegrationTest {

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
    @Autowired private PostRepository postRepository;
    @Autowired private JwtService jwtService;
    @Autowired private JdbcTemplate jdbc;

    private User alice;
    private User bob;
    private String aliceJwt;

    @BeforeEach
    void seed() {
        jdbc.update("DELETE FROM friend_relationships");
        postRepository.deleteAll();
        userRepository.deleteAll();
        alice = userRepository.saveAndFlush(new User(
                "alice-engctrl-" + UUID.randomUUID().toString().substring(0, 8) + "@test.local",
                "$2a$10$x", "Alice", "Anderson", "UTC"));
        bob = userRepository.saveAndFlush(new User(
                "bob-engctrl-" + UUID.randomUUID().toString().substring(0, 8) + "@test.local",
                "$2a$10$x", "Bob", "Bennett", "UTC"));
        aliceJwt = jwtService.generateToken(alice.getId(), false);
    }

    private UUID seedPost(UUID userId, String visibility) {
        UUID id = UUID.randomUUID();
        jdbc.update("""
                INSERT INTO posts (id, user_id, post_type, content, visibility, moderation_status)
                VALUES (?, ?, 'prayer_request', 'engctrl test', ?, 'approved')
                """, id, userId, visibility);
        return id;
    }

    private UUID seedPostWithCreatedAt(UUID userId, String visibility, String createdAt) {
        UUID id = UUID.randomUUID();
        jdbc.update("""
                INSERT INTO posts (id, user_id, post_type, content, visibility, moderation_status,
                                   created_at, updated_at, last_activity_at)
                VALUES (?, ?, 'prayer_request', 'engctrl', ?, 'approved',
                        ?::timestamptz, ?::timestamptz, ?::timestamptz)
                """, id, userId, visibility, createdAt, createdAt, createdAt);
        return id;
    }

    private void seedReaction(UUID postId, UUID userId, String reactionType) {
        jdbc.update("INSERT INTO post_reactions (post_id, user_id, reaction_type) VALUES (?, ?, ?)",
                postId, userId, reactionType);
    }

    private void seedBookmarkWithCreatedAt(UUID postId, UUID userId, String createdAt) {
        jdbc.update("""
                INSERT INTO post_bookmarks (post_id, user_id, created_at)
                VALUES (?, ?, ?::timestamptz)
                """, postId, userId, createdAt);
    }

    // ==========================================================================
    // GET /api/v1/users/me/reactions
    // ==========================================================================

    @Test
    void getReactions_unauthenticated_returns401() throws Exception {
        mvc.perform(get("/api/v1/users/me/reactions"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void getReactions_responseShape_dataReactionsMetaRequestId() throws Exception {
        UUID postId = seedPost(bob.getId(), "public");
        seedReaction(postId, alice.getId(), "praying");

        MvcResult result = mvc.perform(get("/api/v1/users/me/reactions")
                        .header("Authorization", "Bearer " + aliceJwt))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.reactions").exists())
                .andExpect(jsonPath("$.meta.requestId").exists())
                .andReturn();
        JsonNode reactions = mapper.readTree(result.getResponse().getContentAsString())
                .path("data").path("reactions");
        assertThat(reactions.has(postId.toString())).isTrue();
        assertThat(reactions.path(postId.toString()).path("isPraying").asBoolean()).isTrue();
        assertThat(reactions.path(postId.toString()).path("isBookmarked").asBoolean()).isFalse();
    }

    @Test
    void getReactions_emptyEngagement_returnsEmptyMap() throws Exception {
        MvcResult result = mvc.perform(get("/api/v1/users/me/reactions")
                        .header("Authorization", "Bearer " + aliceJwt))
                .andExpect(status().isOk())
                .andReturn();
        JsonNode reactions = mapper.readTree(result.getResponse().getContentAsString())
                .path("data").path("reactions");
        assertThat(reactions.isObject()).isTrue();
        assertThat(reactions.size()).isZero();
    }

    @Test
    void getReactions_mapKeyedByPostIdString() throws Exception {
        UUID postId = seedPost(bob.getId(), "public");
        seedReaction(postId, alice.getId(), "praying");

        MvcResult result = mvc.perform(get("/api/v1/users/me/reactions")
                        .header("Authorization", "Bearer " + aliceJwt))
                .andExpect(status().isOk())
                .andReturn();
        JsonNode reactions = mapper.readTree(result.getResponse().getContentAsString())
                .path("data").path("reactions");
        assertThat(reactions.fieldNames().next()).isEqualTo(postId.toString());
        JsonNode entry = reactions.path(postId.toString());
        assertThat(entry.has("isPraying")).isTrue();
        assertThat(entry.has("isBookmarked")).isTrue();
    }

    // ==========================================================================
    // GET /api/v1/users/me/bookmarks
    // ==========================================================================

    @Test
    void getBookmarks_unauthenticated_returns401() throws Exception {
        mvc.perform(get("/api/v1/users/me/bookmarks"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void getBookmarks_emptyResult_returnsEmptyDataValidMeta() throws Exception {
        mvc.perform(get("/api/v1/users/me/bookmarks")
                        .header("Authorization", "Bearer " + aliceJwt))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data").isArray())
                .andExpect(jsonPath("$.data.length()").value(0))
                .andExpect(jsonPath("$.meta.totalCount").value(0));
    }

    @Test
    void getBookmarks_paginationAndSort_byBookmarkCreatedAtDesc() throws Exception {
        UUID oldPost = seedPostWithCreatedAt(bob.getId(), "public", "2026-01-01 00:00:00+00");
        UUID newPost = seedPostWithCreatedAt(bob.getId(), "public", "2026-04-25 00:00:00+00");
        seedBookmarkWithCreatedAt(oldPost, alice.getId(), "2026-04-28 10:00:00+00");
        seedBookmarkWithCreatedAt(newPost, alice.getId(), "2026-04-27 10:00:00+00");

        MvcResult result = mvc.perform(get("/api/v1/users/me/bookmarks")
                        .header("Authorization", "Bearer " + aliceJwt))
                .andExpect(status().isOk())
                .andReturn();
        JsonNode data = mapper.readTree(result.getResponse().getContentAsString()).get("data");
        assertThat(data.get(0).get("id").asText()).isEqualTo(oldPost.toString());
        assertThat(data.get(1).get("id").asText()).isEqualTo(newPost.toString());
    }

    @Test
    void getBookmarks_visibilityRespected_unfriendedPostExcludedAtHttpLevel() throws Exception {
        UUID friendsPost = seedPost(bob.getId(), "friends");
        seedBookmarkWithCreatedAt(friendsPost, alice.getId(), "2026-04-28 10:00:00+00");

        // No friendship → bookmark not visible.
        MvcResult result = mvc.perform(get("/api/v1/users/me/bookmarks")
                        .header("Authorization", "Bearer " + aliceJwt))
                .andExpect(status().isOk())
                .andReturn();
        JsonNode data = mapper.readTree(result.getResponse().getContentAsString()).get("data");
        for (JsonNode p : data) {
            assertThat(p.get("id").asText()).isNotEqualTo(friendsPost.toString());
        }
    }

    @Test
    void getBookmarks_limit51_returns400InvalidInput() throws Exception {
        mvc.perform(get("/api/v1/users/me/bookmarks")
                        .header("Authorization", "Bearer " + aliceJwt)
                        .param("limit", "51"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("INVALID_INPUT"));
    }

    @Test
    void getBookmarks_responseShape_postListResponseEnvelope() throws Exception {
        UUID postId = seedPost(bob.getId(), "public");
        seedBookmarkWithCreatedAt(postId, alice.getId(), "2026-04-28 10:00:00+00");

        mvc.perform(get("/api/v1/users/me/bookmarks")
                        .header("Authorization", "Bearer " + aliceJwt))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data").isArray())
                .andExpect(jsonPath("$.data[0].id").value(postId.toString()))
                .andExpect(jsonPath("$.data[0].author").exists())
                .andExpect(jsonPath("$.meta.page").value(1))
                .andExpect(jsonPath("$.meta.limit").value(20))
                .andExpect(jsonPath("$.meta.totalCount").exists())
                .andExpect(jsonPath("$.meta.totalPages").exists())
                .andExpect(jsonPath("$.meta.hasNextPage").exists())
                .andExpect(jsonPath("$.meta.hasPrevPage").exists())
                .andExpect(jsonPath("$.meta.requestId").exists());
    }
}
