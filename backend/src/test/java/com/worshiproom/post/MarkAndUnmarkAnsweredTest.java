package com.worshiproom.post;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.worshiproom.auth.JwtService;
import com.worshiproom.support.AbstractIntegrationTest;
import com.worshiproom.user.User;
import com.worshiproom.user.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.cache.CacheManager;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;

import java.time.OffsetDateTime;
import java.util.HashSet;
import java.util.Set;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Spec 6.6b — answered-text edit + un-mark lifecycle on
 * {@code PATCH /api/v1/posts/{id}}.
 *
 * <p>Covers T16, T17, T18 from spec-6-6b.md § 9. The backend behavior is
 * shipped from Spec 6.6 ({@code PostService.updatePost} already handles
 * {@code isAnswered} transitions both directions AND {@code answeredText}
 * edits on already-answered posts, with NO time-window restriction on
 * {@code answeredText} edits per W28). 6.6b's frontend exposes these flows
 * via new affordances; these integration tests prove the backend contract
 * the frontend depends on.
 */
@AutoConfigureMockMvc
class MarkAndUnmarkAnsweredTest extends AbstractIntegrationTest {

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
    @Autowired private CacheManager cacheManager;

    private User alice;
    private User bob;
    private String aliceJwt;
    private String bobJwt;

    @BeforeEach
    void seed() {
        var answeredCache = cacheManager.getCache("answered-feed");
        if (answeredCache != null) answeredCache.clear();

        jdbc.update("DELETE FROM activity_log");
        jdbc.update("DELETE FROM friend_relationships");
        jdbc.update("DELETE FROM post_reactions");
        jdbc.update("DELETE FROM post_bookmarks");
        jdbc.update("DELETE FROM post_comments");
        jdbc.update("DELETE FROM posts");
        jdbc.update("DELETE FROM users");

        alice = userRepository.saveAndFlush(new User("alice-mark@test.local", "$2a$10$x",
                "Alice", "Anderson", "UTC"));
        bob = userRepository.saveAndFlush(new User("bob-mark@test.local", "$2a$10$x",
                "Bob", "Bennett", "UTC"));
        aliceJwt = jwtService.generateToken(alice.getId(), false);
        bobJwt = jwtService.generateToken(bob.getId(), false);
    }

    private UUID seedAnsweredPost(UUID authorId, OffsetDateTime answeredAt,
                                   OffsetDateTime createdAt, String answeredText) {
        UUID id = UUID.randomUUID();
        jdbc.update("""
                INSERT INTO posts (id, user_id, post_type, content, category, visibility, moderation_status,
                                   is_deleted, is_answered, answered_text, answered_at, created_at)
                VALUES (?, ?, 'prayer_request', 'pray for me', 'health', 'public', 'approved',
                        false, true, ?, ?, ?)
                """, id, authorId, answeredText, answeredAt, createdAt);
        return id;
    }

    // ─── T16: PATCH with answeredText rejects non-author ─────────────────────

    @Test
    void updatePost_answeredTextByNonAuthor_returns403() throws Exception {
        UUID alicePostId = seedAnsweredPost(alice.getId(),
                OffsetDateTime.now(), OffsetDateTime.now(), "original");

        // Bob (non-author) attempts to edit Alice's answered_text.
        mvc.perform(patch("/api/v1/posts/{id}", alicePostId)
                        .header("Authorization", "Bearer " + bobJwt)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"answeredText\":\"Bob tries to edit\"}"))
                .andExpect(status().isForbidden());

        // Author CAN edit.
        mvc.perform(patch("/api/v1/posts/{id}", alicePostId)
                        .header("Authorization", "Bearer " + aliceJwt)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"answeredText\":\"Alice edits her own\"}"))
                .andExpect(status().isOk());

        String dbText = jdbc.queryForObject(
                "SELECT answered_text FROM posts WHERE id = ?", String.class, alicePostId);
        assertThat(dbText).isEqualTo("Alice edits her own");
    }

    // ─── T17: PATCH isAnswered=false sets is_answered=false AND answered_at=NULL,
    //           and post leaves the sort=answered feed ─────────────────────────

    @Test
    void updatePost_isAnsweredFalse_unmarksPostAndRemovesFromAnsweredFeed() throws Exception {
        UUID postId = seedAnsweredPost(alice.getId(),
                OffsetDateTime.now(), OffsetDateTime.now(), "praise!");

        // Pre-check: post is in the answered feed.
        MvcResult before = mvc.perform(get("/api/v1/posts").param("sort", "answered"))
                .andExpect(status().isOk()).andReturn();
        Set<String> beforeIds = idsOf(mapper.readTree(before.getResponse().getContentAsString()).get("data"));
        assertThat(beforeIds).contains(postId.toString());

        // Un-mark.
        mvc.perform(patch("/api/v1/posts/{id}", postId)
                        .header("Authorization", "Bearer " + aliceJwt)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"isAnswered\":false}"))
                .andExpect(status().isOk());

        // DB-level assertions.
        Boolean isAnswered = jdbc.queryForObject(
                "SELECT is_answered FROM posts WHERE id = ?", Boolean.class, postId);
        assertThat(isAnswered).isFalse();
        OffsetDateTime answeredAt = jdbc.queryForObject(
                "SELECT answered_at FROM posts WHERE id = ?", OffsetDateTime.class, postId);
        assertThat(answeredAt)
                .as("answered_at must be cleared when is_answered flips to false")
                .isNull();

        // Post leaves the answered feed.
        MvcResult after = mvc.perform(get("/api/v1/posts").param("sort", "answered"))
                .andExpect(status().isOk()).andReturn();
        Set<String> afterIds = idsOf(mapper.readTree(after.getResponse().getContentAsString()).get("data"));
        assertThat(afterIds)
                .as("un-marked post must NOT appear in sort=answered feed")
                .doesNotContain(postId.toString());
    }

    // ─── T18: answered_text edit succeeds outside the original edit window ───
    // Spec 6.6b W28: answered_text editing has NO time-window restriction (unlike
    // content edits, which Spec 4 imposes a 5-minute window on). Create a post
    // marked answered 10 days ago and verify the PATCH still succeeds.

    @Test
    void updatePost_answeredTextEdit_outsideEditWindow_succeeds() throws Exception {
        UUID oldId = seedAnsweredPost(alice.getId(),
                OffsetDateTime.now().minusDays(10),
                OffsetDateTime.now().minusDays(11),
                "initial praise");

        mvc.perform(patch("/api/v1/posts/{id}", oldId)
                        .header("Authorization", "Bearer " + aliceJwt)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"answeredText\":\"Edited 10 days later\"}"))
                .andExpect(status().isOk());

        String dbText = jdbc.queryForObject(
                "SELECT answered_text FROM posts WHERE id = ?", String.class, oldId);
        assertThat(dbText).isEqualTo("Edited 10 days later");
    }

    private Set<String> idsOf(JsonNode data) {
        Set<String> ids = new HashSet<>();
        for (JsonNode p : data) {
            ids.add(p.get("id").asText());
        }
        return ids;
    }
}
