package com.worshiproom.post.comment;

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

import java.time.OffsetDateTime;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@AutoConfigureMockMvc
class PostCommentControllerIntegrationTest extends AbstractIntegrationTest {

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
        postRepository.deleteAll();
        userRepository.deleteAll();
        alice = userRepository.saveAndFlush(new User(
                "alice-cmnt-" + UUID.randomUUID().toString().substring(0, 8) + "@test.local",
                "$2a$10$x", "Alice", "Anderson", "UTC"));
        bob = userRepository.saveAndFlush(new User(
                "bob-cmnt-" + UUID.randomUUID().toString().substring(0, 8) + "@test.local",
                "$2a$10$x", "Bob", "Bennett", "UTC"));
        aliceJwt = jwtService.generateToken(alice.getId(), false);
    }

    private UUID seedPost(UUID userId, String visibility, boolean deleted) {
        UUID id = UUID.randomUUID();
        jdbc.update("""
                INSERT INTO posts (id, user_id, post_type, content, visibility, moderation_status,
                                   is_deleted, deleted_at)
                VALUES (?, ?, 'prayer_request', 'comment-ctrl test', ?, 'approved', ?, ?)
                """,
                id, userId, visibility, deleted, deleted ? OffsetDateTime.now() : null);
        return id;
    }

    private UUID seedComment(UUID postId, UUID userId, String content) {
        UUID id = UUID.randomUUID();
        jdbc.update("""
                INSERT INTO post_comments (id, post_id, user_id, content)
                VALUES (?, ?, ?, ?)
                """, id, postId, userId, content);
        return id;
    }

    @Test
    void getComments_responseShape_envelopeAndMeta() throws Exception {
        UUID postId = seedPost(alice.getId(), "public", false);
        seedComment(postId, alice.getId(), "first");
        mvc.perform(get("/api/v1/posts/" + postId + "/comments"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data").isArray())
                .andExpect(jsonPath("$.meta.page").value(1))
                .andExpect(jsonPath("$.meta.limit").value(20))
                .andExpect(jsonPath("$.meta.totalCount").exists())
                .andExpect(jsonPath("$.meta.totalPages").exists())
                .andExpect(jsonPath("$.meta.hasNextPage").exists())
                .andExpect(jsonPath("$.meta.hasPrevPage").exists())
                .andExpect(jsonPath("$.meta.requestId").exists());
    }

    @Test
    void getComments_xRequestIdHeader_matchesMetaRequestId() throws Exception {
        UUID postId = seedPost(alice.getId(), "public", false);
        MvcResult result = mvc.perform(get("/api/v1/posts/" + postId + "/comments"))
                .andExpect(status().isOk())
                .andReturn();
        String headerRequestId = result.getResponse().getHeader("X-Request-Id");
        String bodyRequestId = mapper.readTree(result.getResponse().getContentAsString())
                .get("meta").get("requestId").asText();
        assertThat(headerRequestId).isNotNull().isEqualTo(bodyRequestId);
    }

    @Test
    void getComments_postNotFound_returns404PostNotFound() throws Exception {
        UUID random = UUID.randomUUID();
        mvc.perform(get("/api/v1/posts/" + random + "/comments"))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.code").value("POST_NOT_FOUND"));
    }

    @Test
    void getComments_postSoftDeleted_returns404PostNotFound() throws Exception {
        UUID deleted = seedPost(alice.getId(), "public", true);
        mvc.perform(get("/api/v1/posts/" + deleted + "/comments"))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.code").value("POST_NOT_FOUND"));
    }

    @Test
    void getComments_postNotVisible_returns404PostNotFound() throws Exception {
        UUID bobsPrivate = seedPost(bob.getId(), "private", false);
        mvc.perform(get("/api/v1/posts/" + bobsPrivate + "/comments")
                        .header("Authorization", "Bearer " + aliceJwt))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.code").value("POST_NOT_FOUND"));
    }

    @Test
    void getComments_anonymousCallerCanReadPublicPostComments() throws Exception {
        UUID postId = seedPost(alice.getId(), "public", false);
        seedComment(postId, alice.getId(), "anon-readable");

        MvcResult result = mvc.perform(get("/api/v1/posts/" + postId + "/comments"))
                .andExpect(status().isOk())
                .andReturn();
        JsonNode data = mapper.readTree(result.getResponse().getContentAsString()).get("data");
        assertThat(data.size()).isEqualTo(1);
        assertThat(data.get(0).get("content").asText()).isEqualTo("anon-readable");
    }

    @Test
    void getComments_repliesArrayPresentEvenWhenEmpty() throws Exception {
        UUID postId = seedPost(alice.getId(), "public", false);
        seedComment(postId, alice.getId(), "lonely");

        MvcResult result = mvc.perform(get("/api/v1/posts/" + postId + "/comments"))
                .andExpect(status().isOk())
                .andReturn();
        JsonNode commentNode = mapper.readTree(result.getResponse().getContentAsString())
                .path("data").path(0);
        assertThat(commentNode.has("replies"))
                .as("replies field must be present")
                .isTrue();
        assertThat(commentNode.get("replies").isArray())
                .as("replies must be an array (not null, not absent)")
                .isTrue();
        assertThat(commentNode.get("replies").size())
                .as("replies must be empty for top-level comment with no children")
                .isZero();
    }

    @Test
    void getComments_limit51_returns400InvalidInput() throws Exception {
        UUID postId = seedPost(alice.getId(), "public", false);
        mvc.perform(get("/api/v1/posts/" + postId + "/comments").param("limit", "51"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("INVALID_INPUT"));
    }

    @Test
    void getComments_page0_returns400InvalidInput() throws Exception {
        UUID postId = seedPost(alice.getId(), "public", false);
        mvc.perform(get("/api/v1/posts/" + postId + "/comments").param("page", "0"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("INVALID_INPUT"));
    }

    @Test
    void getComments_malformedUuid_returns400() throws Exception {
        mvc.perform(get("/api/v1/posts/not-a-uuid/comments"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("INVALID_INPUT"));
    }

    @Test
    void getComments_authorBlock_realUserAlwaysShown() throws Exception {
        UUID postId = seedPost(alice.getId(), "public", false);
        seedComment(postId, alice.getId(), "by alice");

        MvcResult result = mvc.perform(get("/api/v1/posts/" + postId + "/comments"))
                .andExpect(status().isOk())
                .andReturn();
        JsonNode author = mapper.readTree(result.getResponse().getContentAsString())
                .path("data").path(0).path("author");
        assertThat(author.get("id").asText()).isEqualTo(alice.getId().toString());
        assertThat(author.get("displayName").asText())
                .isNotBlank()
                .isNotEqualTo("Anonymous");
    }
}
