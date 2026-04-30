package com.worshiproom.post.report;

import com.worshiproom.auth.JwtService;
import com.worshiproom.support.AbstractIntegrationTest;
import com.worshiproom.user.User;
import com.worshiproom.user.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.test.web.servlet.MockMvc;

import java.time.OffsetDateTime;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Spec 3.8 — end-to-end HTTP coverage of {@code POST /api/v1/posts/{postId}/reports}
 * and {@code POST /api/v1/comments/{commentId}/reports}.
 *
 * <p>Rate-limit override: {@code max-per-hour=10} matches the prod default so the
 * shared-bucket test can fire 11 calls and confirm the 11th is 429.
 */
@AutoConfigureMockMvc
class ReportControllerTest extends AbstractIntegrationTest {

    private static final String TEST_JWT_SECRET =
            "test-jwt-secret-at-least-32-bytes-long-xxxxxxxxxxxxxx";

    @DynamicPropertySource
    static void properties(DynamicPropertyRegistry registry) {
        registry.add("jwt.secret", () -> TEST_JWT_SECRET);
        registry.add("auth.rate-limit.per-email.capacity", () -> "1000");
        registry.add("auth.rate-limit.per-ip.capacity", () -> "10000");
        registry.add("worshiproom.reports.rate-limit.max-per-hour", () -> "10");
    }

    @Autowired private MockMvc mvc;
    @Autowired private UserRepository userRepository;
    @Autowired private JwtService jwtService;
    @Autowired private JdbcTemplate jdbc;

    private User alice;
    private User bob;
    private UUID alicePostId;
    private String bobJwt;
    private String aliceJwt;

    @BeforeEach
    void seed() {
        jdbc.update("DELETE FROM activity_log");
        jdbc.update("DELETE FROM friend_relationships");
        jdbc.update("DELETE FROM post_reports");
        jdbc.update("DELETE FROM post_reactions");
        jdbc.update("DELETE FROM post_bookmarks");
        jdbc.update("DELETE FROM post_comments");
        jdbc.update("DELETE FROM posts");
        jdbc.update("DELETE FROM users");

        alice = userRepository.saveAndFlush(new User(
                "alice-rep-ctrl-" + UUID.randomUUID().toString().substring(0, 8) + "@test.local",
                "$2a$10$x", "Alice", "Anderson", "UTC"));
        bob = userRepository.saveAndFlush(new User(
                "bob-rep-ctrl-" + UUID.randomUUID().toString().substring(0, 8) + "@test.local",
                "$2a$10$x", "Bob", "Bennett", "UTC"));
        bobJwt = jwtService.generateToken(bob.getId(), false);
        aliceJwt = jwtService.generateToken(alice.getId(), false);

        alicePostId = seedPost(alice.getId(), false, false);
    }

    private UUID seedPost(UUID userId, boolean crisisFlag, boolean deleted) {
        UUID id = UUID.randomUUID();
        jdbc.update("""
                INSERT INTO posts (id, user_id, post_type, content, visibility, moderation_status,
                                   is_deleted, deleted_at, crisis_flag)
                VALUES (?, ?, 'prayer_request', 'rep ctrl test', 'public', 'approved', ?, ?, ?)
                """, id, userId, deleted, deleted ? OffsetDateTime.now() : null, crisisFlag);
        return id;
    }

    private UUID seedComment(UUID postId, UUID userId) {
        UUID id = UUID.randomUUID();
        jdbc.update("""
                INSERT INTO post_comments (id, post_id, user_id, content)
                VALUES (?, ?, ?, 'comment for report test')
                """, id, postId, userId);
        return id;
    }

    private String body(String reason, String details) {
        if (details == null) {
            return "{\"reason\":\"" + reason + "\"}";
        }
        return "{\"reason\":\"" + reason + "\",\"details\":" + jsonString(details) + "}";
    }

    private String jsonString(String s) {
        return "\"" + s.replace("\\", "\\\\").replace("\"", "\\\"") + "\"";
    }

    // ─── 1. Happy path → 201 + DB row ─────────────────────────────────────────

    @Test
    void reportPost_happyPath_returns201WithReportId() throws Exception {
        mvc.perform(post("/api/v1/posts/{id}/reports", alicePostId)
                        .header("Authorization", "Bearer " + bobJwt)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body("spam", "looks like spam")))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.data.reportId").exists())
                .andExpect(jsonPath("$.data.created").value(true))
                .andExpect(jsonPath("$.meta.requestId").exists());

        Integer count = jdbc.queryForObject("""
                SELECT COUNT(*) FROM post_reports
                 WHERE post_id = ? AND comment_id IS NULL AND status = 'pending'
                   AND reason = 'spam' AND reporter_id = ?
                """, Integer.class, alicePostId, bob.getId());
        assertThat(count).isEqualTo(1);
    }

    // ─── 2. Idempotent on pending → 200 ───────────────────────────────────────

    @Test
    void reportPost_pendingExists_returns200WithCreatedFalse() throws Exception {
        mvc.perform(post("/api/v1/posts/{id}/reports", alicePostId)
                        .header("Authorization", "Bearer " + bobJwt)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body("spam", null)))
                .andExpect(status().isCreated());

        mvc.perform(post("/api/v1/posts/{id}/reports", alicePostId)
                        .header("Authorization", "Bearer " + bobJwt)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body("spam", null)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.created").value(false));

        assertThat(jdbc.queryForObject(
                "SELECT COUNT(*) FROM post_reports WHERE post_id = ?", Integer.class, alicePostId))
                .isEqualTo(1);
    }

    // ─── 3. Idempotent on pending with different reason — first reason wins ───

    @Test
    void reportPost_pendingExistsWithDifferentReason_returns200FirstReasonWins() throws Exception {
        mvc.perform(post("/api/v1/posts/{id}/reports", alicePostId)
                        .header("Authorization", "Bearer " + bobJwt)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body("spam", null)))
                .andExpect(status().isCreated());

        mvc.perform(post("/api/v1/posts/{id}/reports", alicePostId)
                        .header("Authorization", "Bearer " + bobJwt)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body("harassment", null)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.created").value(false));

        // Reason of the original (spam) is preserved.
        String savedReason = jdbc.queryForObject(
                "SELECT reason FROM post_reports WHERE post_id = ?", String.class, alicePostId);
        assertThat(savedReason).isEqualTo("spam");
    }

    // ─── 4. After dismissed → new pending row ─────────────────────────────────

    @Test
    void reportPost_afterDismissed_returns201WithNewPendingRow() throws Exception {
        UUID dismissedId = UUID.randomUUID();
        jdbc.update("""
                INSERT INTO post_reports (id, post_id, reporter_id, reason, status,
                                          reviewer_id, reviewed_at)
                VALUES (?, ?, ?, 'spam', 'dismissed', ?, NOW())
                """, dismissedId, alicePostId, bob.getId(), alice.getId());

        mvc.perform(post("/api/v1/posts/{id}/reports", alicePostId)
                        .header("Authorization", "Bearer " + bobJwt)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body("spam", null)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.data.created").value(true));

        assertThat(jdbc.queryForObject(
                "SELECT COUNT(*) FROM post_reports WHERE post_id = ?", Integer.class, alicePostId))
                .isEqualTo(2);
    }

    // ─── 5. After actioned → new pending row ──────────────────────────────────

    @Test
    void reportPost_afterActioned_returns201WithNewPendingRow() throws Exception {
        UUID actionedId = UUID.randomUUID();
        jdbc.update("""
                INSERT INTO post_reports (id, post_id, reporter_id, reason, status,
                                          reviewer_id, reviewed_at, action_taken)
                VALUES (?, ?, ?, 'spam', 'actioned', ?, NOW(), 'removed')
                """, actionedId, alicePostId, bob.getId(), alice.getId());

        mvc.perform(post("/api/v1/posts/{id}/reports", alicePostId)
                        .header("Authorization", "Bearer " + bobJwt)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body("spam", null)))
                .andExpect(status().isCreated());
    }

    // ─── 6. Anonymous → 401 ──────────────────────────────────────────────────

    @Test
    void reportPost_anonymous_returns401() throws Exception {
        mvc.perform(post("/api/v1/posts/{id}/reports", alicePostId)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body("spam", null)))
                .andExpect(status().isUnauthorized());
    }

    // ─── 7. Target post not found → 404 ──────────────────────────────────────

    @Test
    void reportPost_targetNotFound_returns404() throws Exception {
        UUID missing = UUID.randomUUID();
        mvc.perform(post("/api/v1/posts/{id}/reports", missing)
                        .header("Authorization", "Bearer " + bobJwt)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body("spam", null)))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.code").value("NOT_FOUND"));
    }

    // ─── 8. Crisis-flagged post is reportable → 201 (D9) ──────────────────────

    @Test
    void reportPost_crisisFlaggedPost_returns201() throws Exception {
        UUID crisisPostId = seedPost(alice.getId(), true, false);
        mvc.perform(post("/api/v1/posts/{id}/reports", crisisPostId)
                        .header("Authorization", "Bearer " + bobJwt)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body("spam", null)))
                .andExpect(status().isCreated());
    }

    // ─── 9. Soft-deleted post is reportable → 201 (D9) ────────────────────────

    @Test
    void reportPost_softDeletedPost_returns201() throws Exception {
        UUID deletedPostId = seedPost(alice.getId(), false, true);
        mvc.perform(post("/api/v1/posts/{id}/reports", deletedPostId)
                        .header("Authorization", "Bearer " + bobJwt)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body("spam", null)))
                .andExpect(status().isCreated());
    }

    // ─── 10. Self-report → 400 SELF_REPORT ────────────────────────────────────

    @Test
    void reportPost_selfReport_returns400SelfReport() throws Exception {
        // alice trying to report alice's own post.
        mvc.perform(post("/api/v1/posts/{id}/reports", alicePostId)
                        .header("Authorization", "Bearer " + aliceJwt)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body("spam", null)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("SELF_REPORT"));
    }

    // ─── 11. Rate limit → 429 with Retry-After ────────────────────────────────

    @Test
    void reportPost_rateLimitExceeded_returns429WithRetryAfter() throws Exception {
        // Seed 10 distinct posts to consume 10 tokens.
        for (int i = 0; i < 10; i++) {
            UUID p = seedPost(alice.getId(), false, false);
            mvc.perform(post("/api/v1/posts/{id}/reports", p)
                            .header("Authorization", "Bearer " + bobJwt)
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(body("spam", null)))
                    .andExpect(status().isCreated());
        }

        UUID extra = seedPost(alice.getId(), false, false);
        var result = mvc.perform(post("/api/v1/posts/{id}/reports", extra)
                        .header("Authorization", "Bearer " + bobJwt)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body("spam", null)))
                .andExpect(status().isTooManyRequests())
                .andExpect(jsonPath("$.code").value("RATE_LIMITED"))
                .andExpect(header().exists("Retry-After"))
                .andReturn();
        long retryAfter = Long.parseLong(result.getResponse().getHeader("Retry-After"));
        assertThat(retryAfter).isPositive();
    }

    // ─── 12. Unknown reason enum → 400 ───────────────────────────────────────

    @Test
    void reportPost_unknownReason_returns400() throws Exception {
        mvc.perform(post("/api/v1/posts/{id}/reports", alicePostId)
                        .header("Authorization", "Bearer " + bobJwt)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"reason\":\"garbage\"}"))
                .andExpect(status().isBadRequest());
    }

    // ─── 13. Details too long → 400 ──────────────────────────────────────────

    @Test
    void reportPost_detailsTooLong_returns400() throws Exception {
        String tooLong = "x".repeat(501);
        mvc.perform(post("/api/v1/posts/{id}/reports", alicePostId)
                        .header("Authorization", "Bearer " + bobJwt)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body("spam", tooLong)))
                .andExpect(status().isBadRequest());
    }

    // ─── 14. Comment-report happy path → 201 ──────────────────────────────────

    @Test
    void reportComment_happyPath_returns201() throws Exception {
        UUID commentId = seedComment(alicePostId, alice.getId());
        mvc.perform(post("/api/v1/comments/{id}/reports", commentId)
                        .header("Authorization", "Bearer " + bobJwt)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body("harassment", null)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.data.created").value(true));

        Integer count = jdbc.queryForObject("""
                SELECT COUNT(*) FROM post_reports
                 WHERE comment_id = ? AND post_id IS NULL AND status = 'pending'
                """, Integer.class, commentId);
        assertThat(count).isEqualTo(1);
    }

    // ─── 15. Comment-report target not found → 404 ───────────────────────────

    @Test
    void reportComment_targetNotFound_returns404() throws Exception {
        UUID missing = UUID.randomUUID();
        mvc.perform(post("/api/v1/comments/{id}/reports", missing)
                        .header("Authorization", "Bearer " + bobJwt)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body("spam", null)))
                .andExpect(status().isNotFound());
    }

    // ─── 16. Shared rate limit between post and comment reports → 429 ────────

    @Test
    void reportEndpoints_shareRateLimitBucket_returns429() throws Exception {
        // 8 post-reports consume 8 tokens.
        for (int i = 0; i < 8; i++) {
            UUID p = seedPost(alice.getId(), false, false);
            mvc.perform(post("/api/v1/posts/{id}/reports", p)
                            .header("Authorization", "Bearer " + bobJwt)
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(body("spam", null)))
                    .andExpect(status().isCreated());
        }

        // 2 comment-reports consume the remaining 2 tokens (total = 10).
        for (int i = 0; i < 2; i++) {
            UUID c = seedComment(alicePostId, alice.getId());
            mvc.perform(post("/api/v1/comments/{id}/reports", c)
                            .header("Authorization", "Bearer " + bobJwt)
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(body("spam", null)))
                    .andExpect(status().isCreated());
        }

        // 11th call (any endpoint) → 429.
        UUID extra = seedComment(alicePostId, alice.getId());
        mvc.perform(post("/api/v1/comments/{id}/reports", extra)
                        .header("Authorization", "Bearer " + bobJwt)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body("spam", null)))
                .andExpect(status().isTooManyRequests())
                .andExpect(jsonPath("$.code").value("RATE_LIMITED"));
    }
}
