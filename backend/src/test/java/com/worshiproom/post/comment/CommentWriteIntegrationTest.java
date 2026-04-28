package com.worshiproom.post.comment;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.worshiproom.auth.JwtService;
import com.worshiproom.post.comment.dto.CreateCommentRequest;
import com.worshiproom.safety.ContentType;
import com.worshiproom.safety.CrisisAlertService;
import com.worshiproom.support.AbstractIntegrationTest;
import com.worshiproom.user.User;
import com.worshiproom.user.UserRepository;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.Mockito;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.mock.mockito.SpyBean;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import org.springframework.transaction.UnexpectedRollbackException;
import org.springframework.transaction.support.TransactionTemplate;

import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * End-to-end HTTP coverage of the three Spec 3.6 comment-write endpoints. Hits the
 * full filter chain including Spring Security auth gating, MVC validation, the
 * package-scoped advice handlers, and the real Testcontainers PostgreSQL.
 *
 * <p>Test groupings:
 * <ul>
 *   <li>POST happy paths — top-level + threaded reply, idempotency, Location header,
 *       L1-cache regression guard (createdAt/updatedAt populated in response).</li>
 *   <li>POST validation failures — empty content, content too long, invalid parent
 *       comment, parent on different post, parent soft-deleted.</li>
 *   <li>POST auth — 401 without JWT.</li>
 *   <li>POST rate limiting — 30 successes then 31st returns 429 with Retry-After,
 *       isolation across users.</li>
 *   <li>POST crisis detection — keyword match returns 201 with crisisResources block,
 *       persists crisis_flag = true (top-level AND threaded reply paths).</li>
 *   <li>POST counter — comment_count + last_activity_at bumped on create.</li>
 *   <li>POST not-found — soft-deleted parent post returns 404.</li>
 *   <li>POST AFTER_COMMIT contract — rolled-back transaction does NOT dispatch
 *       Sentry alert (regression guard against the listener phase being changed).</li>
 *   <li>PATCH — within-window succeeds, after-window 409, non-author 403.</li>
 *   <li>DELETE — author 204 + counter decrement, idempotent re-delete, non-author 403.</li>
 * </ul>
 */
@AutoConfigureMockMvc
class CommentWriteIntegrationTest extends AbstractIntegrationTest {

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
    @Autowired private PostCommentService commentService;
    @Autowired private TransactionTemplate txTemplate;

    /**
     * Spy on the real bean so we can verify the AFTER_COMMIT listener path —
     * specifically that {@link CrisisAlertService#alert(UUID, UUID, ContentType)}
     * is NOT invoked when the surrounding transaction rolls back.
     *
     * <p>Reset in {@code @BeforeEach} so prior tests' invocations don't leak
     * into per-test {@code verify(..., never())} assertions. The spy delegates
     * to the real implementation by default — Sentry's send-default-pii=false +
     * empty DSN make {@code Sentry.captureMessage(...)} a no-op in tests, so
     * this does not generate spurious upstream traffic.
     */
    @SpyBean private CrisisAlertService crisisAlertService;

    private User alice;
    private User bob;
    private UUID parentPostId;
    private String aliceJwt;
    private String bobJwt;

    @BeforeEach
    void seed() {
        // Order: comments depend on posts; posts depend on users; activity_log depends on users.
        // Use direct SQL DELETE rather than JpaRepository.deleteAll() to avoid
        // ObjectOptimisticLockingFailure when leftover rows from prior test runs
        // were modified via raw JDBC (which the entity manager isn't tracking).
        jdbc.update("DELETE FROM activity_log");
        jdbc.update("DELETE FROM post_comments");
        jdbc.update("DELETE FROM posts");
        jdbc.update("DELETE FROM users");

        alice = userRepository.saveAndFlush(new User("alice-cmt@test.local", "$2a$10$x",
                "Alice", "Anderson", "UTC"));
        bob = userRepository.saveAndFlush(new User("bob-cmt@test.local", "$2a$10$x",
                "Bob", "Bennett", "UTC"));
        aliceJwt = jwtService.generateToken(alice.getId(), false);
        bobJwt = jwtService.generateToken(bob.getId(), false);

        parentPostId = seedPostDirect(alice.getId(), "Please pray for my surgery.");

        // Reset the spy so prior tests' invocations don't pollute per-test
        // verify(..., never()) assertions on the AFTER_COMMIT path.
        Mockito.reset(crisisAlertService);
    }

    @AfterEach
    void cleanup() {
        jdbc.update("DELETE FROM activity_log");
        jdbc.update("DELETE FROM post_comments");
        jdbc.update("DELETE FROM posts");
        jdbc.update("DELETE FROM users");
    }

    /** Direct SQL insert — Post entity has protected no-arg constructor for JPA only. */
    private UUID seedPostDirect(UUID userId, String content) {
        UUID id = UUID.randomUUID();
        jdbc.update("""
                INSERT INTO posts (id, user_id, post_type, content, category, visibility,
                                   moderation_status, is_deleted, is_anonymous)
                VALUES (?, ?, 'prayer_request', ?, 'family', 'public', 'approved', false, false)
                """,
                id, userId, content);
        return id;
    }

    // =========================================================================
    // POST happy paths
    // =========================================================================

    @Test
    void postTopLevelCommentReturns201WithLocationHeader() throws Exception {
        String body = """
                {
                  "content": "Praying for you, sister."
                }
                """;
        mvc.perform(post("/api/v1/posts/" + parentPostId + "/comments")
                        .header("Authorization", "Bearer " + bobJwt)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body))
                .andExpect(status().isCreated())
                .andExpect(header().exists("Location"))
                .andExpect(jsonPath("$.data.id").exists())
                .andExpect(jsonPath("$.data.postId").value(parentPostId.toString()))
                .andExpect(jsonPath("$.data.content").value("Praying for you, sister."))
                .andExpect(jsonPath("$.data.crisisFlag").value(false))
                // L1-cache regression guard: timestamps must be present from DB DEFAULT NOW().
                .andExpect(jsonPath("$.data.createdAt").exists())
                .andExpect(jsonPath("$.data.updatedAt").exists())
                .andExpect(jsonPath("$.crisisResources").doesNotExist())
                .andExpect(jsonPath("$.meta.requestId").exists());

        Long activityCount = jdbc.queryForObject(
                "SELECT COUNT(*) FROM activity_log WHERE user_id = ? AND activity_type = 'intercession'",
                Long.class, bob.getId());
        assertThat(activityCount).isEqualTo(1L);
    }

    @Test
    void postIncludesCreatedAtAndUpdatedAtAsNonNull() throws Exception {
        // L1-cache regression test — without entityManager.refresh(saved) in
        // PostCommentService.createComment, Hibernate's L1 cache returns the
        // managed entity unchanged after save+flush, leaving timestamps null.
        // Jackson's @JsonInclude(NON_NULL) drops nulls. This test catches the
        // omission by asserting the values are non-null strings.
        String body = """
                {
                  "content": "Test for timestamp regression."
                }
                """;
        MvcResult result = mvc.perform(post("/api/v1/posts/" + parentPostId + "/comments")
                        .header("Authorization", "Bearer " + bobJwt)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body))
                .andExpect(status().isCreated())
                .andReturn();

        var json = mapper.readTree(result.getResponse().getContentAsString());
        assertThat(json.get("data").get("createdAt").isNull()).isFalse();
        assertThat(json.get("data").get("updatedAt").isNull()).isFalse();
    }

    @Test
    void postThreadedReplyReturns201() throws Exception {
        // First, create the parent comment.
        String parentBody = """
                { "content": "Praying for you." }
                """;
        MvcResult parentResult = mvc.perform(post("/api/v1/posts/" + parentPostId + "/comments")
                        .header("Authorization", "Bearer " + bobJwt)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(parentBody))
                .andExpect(status().isCreated())
                .andReturn();
        var parentJson = mapper.readTree(parentResult.getResponse().getContentAsString());
        String parentCommentId = parentJson.get("data").get("id").asText();

        // Now post a reply to that comment.
        String replyBody = String.format("""
                {
                  "content": "Yes, joining you in prayer.",
                  "parentCommentId": "%s"
                }
                """, parentCommentId);

        mvc.perform(post("/api/v1/posts/" + parentPostId + "/comments")
                        .header("Authorization", "Bearer " + aliceJwt)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(replyBody))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.data.parentCommentId").value(parentCommentId));
    }

    @Test
    void postWithIdempotencyKeyCachesResponse() throws Exception {
        String body = """
                { "content": "Idempotent comment." }
                """;
        MvcResult first = mvc.perform(post("/api/v1/posts/" + parentPostId + "/comments")
                        .header("Authorization", "Bearer " + bobJwt)
                        .header("Idempotency-Key", "comment-key-1")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body))
                .andExpect(status().isCreated())
                .andReturn();
        String firstId = mapper.readTree(first.getResponse().getContentAsString())
                .get("data").get("id").asText();

        MvcResult second = mvc.perform(post("/api/v1/posts/" + parentPostId + "/comments")
                        .header("Authorization", "Bearer " + bobJwt)
                        .header("Idempotency-Key", "comment-key-1")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body))
                .andExpect(status().isCreated())
                .andReturn();
        String secondId = mapper.readTree(second.getResponse().getContentAsString())
                .get("data").get("id").asText();

        assertThat(secondId).isEqualTo(firstId);
        // Single comment row in DB (idempotent replay didn't create a duplicate).
        Long commentCount = jdbc.queryForObject(
                "SELECT COUNT(*) FROM post_comments WHERE post_id = ?", Long.class, parentPostId);
        assertThat(commentCount).isEqualTo(1L);
    }

    // =========================================================================
    // POST validation failures
    // =========================================================================

    @Test
    void postEmptyContentReturns400() throws Exception {
        String body = """
                { "content": "" }
                """;
        mvc.perform(post("/api/v1/posts/" + parentPostId + "/comments")
                        .header("Authorization", "Bearer " + bobJwt)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body))
                .andExpect(status().isBadRequest());
    }

    @Test
    void postContentTooLongReturns400() throws Exception {
        String tooLong = "a".repeat(5001);
        String body = String.format("{\"content\": \"%s\"}", tooLong);
        mvc.perform(post("/api/v1/posts/" + parentPostId + "/comments")
                        .header("Authorization", "Bearer " + bobJwt)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body))
                .andExpect(status().isBadRequest());
    }

    @Test
    void postInvalidParentCommentIdReturns400() throws Exception {
        String body = String.format("""
                {
                  "content": "Reply to nonexistent.",
                  "parentCommentId": "%s"
                }
                """, UUID.randomUUID());
        mvc.perform(post("/api/v1/posts/" + parentPostId + "/comments")
                        .header("Authorization", "Bearer " + bobJwt)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("INVALID_INPUT"));
    }

    @Test
    void postParentCommentSoftDeletedReturns400() throws Exception {
        // Spec D11 — `parentCommentId` must reference a LIVE comment. Soft-deleted
        // parents are filtered out by `findByIdAndPostIdAndIsDeletedFalse`, so the
        // service throws InvalidParentCommentException → 400 INVALID_INPUT.
        MvcResult parent = mvc.perform(post("/api/v1/posts/" + parentPostId + "/comments")
                        .header("Authorization", "Bearer " + bobJwt)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"content\": \"will be deleted\"}"))
                .andExpect(status().isCreated())
                .andReturn();
        String parentCommentId = mapper.readTree(parent.getResponse().getContentAsString())
                .get("data").get("id").asText();

        // Soft-delete the parent comment directly via SQL.
        jdbc.update("UPDATE post_comments SET is_deleted = TRUE, deleted_at = NOW() "
                        + "WHERE id = CAST(? AS uuid)",
                parentCommentId);

        String replyBody = String.format("""
                {
                  "content": "Reply to a deleted parent.",
                  "parentCommentId": "%s"
                }
                """, parentCommentId);
        mvc.perform(post("/api/v1/posts/" + parentPostId + "/comments")
                        .header("Authorization", "Bearer " + aliceJwt)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(replyBody))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("INVALID_INPUT"));
    }

    @Test
    void postParentCommentInDifferentPostReturns400() throws Exception {
        // Create a comment on parentPost via API.
        UUID otherPostId = seedPostDirect(alice.getId(), "Different post.");
        String parentBody = """
                { "content": "Original on post A" }
                """;
        MvcResult parentResult = mvc.perform(post("/api/v1/posts/" + parentPostId + "/comments")
                        .header("Authorization", "Bearer " + bobJwt)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(parentBody))
                .andExpect(status().isCreated())
                .andReturn();
        String parentCommentId = mapper.readTree(parentResult.getResponse().getContentAsString())
                .get("data").get("id").asText();

        // Try to reply to that comment via the OTHER post — must fail.
        String replyBody = String.format("""
                {
                  "content": "Cross-post reply attempt.",
                  "parentCommentId": "%s"
                }
                """, parentCommentId);
        mvc.perform(post("/api/v1/posts/" + otherPostId + "/comments")
                        .header("Authorization", "Bearer " + aliceJwt)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(replyBody))
                .andExpect(status().isBadRequest());
    }

    @Test
    void postUnknownFieldsAreIgnored() throws Exception {
        // Unknown JSON fields should be silently ignored, not 400'd.
        String body = """
                {
                  "content": "OK content",
                  "isHelpful": true,
                  "moderationStatus": "FLAGGED",
                  "extraField": "garbage"
                }
                """;
        mvc.perform(post("/api/v1/posts/" + parentPostId + "/comments")
                        .header("Authorization", "Bearer " + bobJwt)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.data.isHelpful").value(false))  // server-controlled
                .andExpect(jsonPath("$.data.moderationStatus").value("approved"));  // server-controlled
    }

    // =========================================================================
    // POST auth
    // =========================================================================

    @Test
    void postWithoutJwtReturns401() throws Exception {
        String body = """
                { "content": "anonymous attempt" }
                """;
        mvc.perform(post("/api/v1/posts/" + parentPostId + "/comments")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void postWithInvalidJwtReturns401() throws Exception {
        String body = """
                { "content": "bad token" }
                """;
        mvc.perform(post("/api/v1/posts/" + parentPostId + "/comments")
                        .header("Authorization", "Bearer not-a-real-jwt")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body))
                .andExpect(status().isUnauthorized());
    }

    // =========================================================================
    // POST crisis detection
    // =========================================================================

    @Test
    void postCrisisKeywordReturns201WithCrisisResourcesAndPersistsFlag() throws Exception {
        String body = """
                { "content": "I want to die today, please help me." }
                """;
        MvcResult result = mvc.perform(post("/api/v1/posts/" + parentPostId + "/comments")
                        .header("Authorization", "Bearer " + bobJwt)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.data.crisisFlag").value(true))
                .andExpect(jsonPath("$.crisisResources").exists())
                .andExpect(jsonPath("$.crisisResources.message").exists())
                .andReturn();

        // Verify crisis_flag persisted in DB.
        String commentId = mapper.readTree(result.getResponse().getContentAsString())
                .get("data").get("id").asText();
        Boolean crisisFlag = jdbc.queryForObject(
                "SELECT crisis_flag FROM post_comments WHERE id = CAST(? AS uuid)",
                Boolean.class, commentId);
        assertThat(crisisFlag).isTrue();
    }

    @Test
    void postNormalContentOmitsCrisisResources() throws Exception {
        String body = """
                { "content": "Just praying for everyone tonight." }
                """;
        mvc.perform(post("/api/v1/posts/" + parentPostId + "/comments")
                        .header("Authorization", "Bearer " + bobJwt)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.crisisResources").doesNotExist());
    }

    @Test
    void postCrisisOnThreadedReplyFiresEventAndPersistsFlag() throws Exception {
        // Crisis detection runs on every comment regardless of nesting depth.
        // Plan spec line 1593 / spec line 309 — coverage parity with the
        // top-level path.
        MvcResult parent = mvc.perform(post("/api/v1/posts/" + parentPostId + "/comments")
                        .header("Authorization", "Bearer " + bobJwt)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"content\": \"Praying for you, sister.\"}"))
                .andExpect(status().isCreated())
                .andReturn();
        String parentCommentId = mapper.readTree(parent.getResponse().getContentAsString())
                .get("data").get("id").asText();

        String replyBody = String.format("""
                {
                  "content": "Honestly I want to die some days.",
                  "parentCommentId": "%s"
                }
                """, parentCommentId);

        MvcResult result = mvc.perform(post("/api/v1/posts/" + parentPostId + "/comments")
                        .header("Authorization", "Bearer " + aliceJwt)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(replyBody))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.data.parentCommentId").value(parentCommentId))
                .andExpect(jsonPath("$.data.crisisFlag").value(true))
                .andExpect(jsonPath("$.crisisResources").exists())
                .andReturn();

        String replyId = mapper.readTree(result.getResponse().getContentAsString())
                .get("data").get("id").asText();
        Boolean crisisFlag = jdbc.queryForObject(
                "SELECT crisis_flag FROM post_comments WHERE id = CAST(? AS uuid)",
                Boolean.class, replyId);
        assertThat(crisisFlag).isTrue();

        // The AFTER_COMMIT listener delegated to the spy alert service exactly once
        // (for the reply — the parent's content was clean, no event fired for it).
        verify(crisisAlertService)
                .alert(any(UUID.class), any(UUID.class), any(ContentType.class));
    }

    // =========================================================================
    // POST counter & last_activity_at
    // =========================================================================

    @Test
    void postIncrementsParentPostCommentCountAndLastActivity() throws Exception {
        OffsetDateTime initialLastActivity = jdbc.queryForObject(
                "SELECT last_activity_at FROM posts WHERE id = ?", OffsetDateTime.class, parentPostId);
        Integer initialCount = jdbc.queryForObject(
                "SELECT comment_count FROM posts WHERE id = ?", Integer.class, parentPostId);
        assertThat(initialCount).isZero();

        // Sleep briefly so last_activity_at change is observable.
        Thread.sleep(10);

        String body = """
                { "content": "Counter test comment." }
                """;
        mvc.perform(post("/api/v1/posts/" + parentPostId + "/comments")
                        .header("Authorization", "Bearer " + bobJwt)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body))
                .andExpect(status().isCreated());

        Integer newCount = jdbc.queryForObject(
                "SELECT comment_count FROM posts WHERE id = ?", Integer.class, parentPostId);
        OffsetDateTime newLastActivity = jdbc.queryForObject(
                "SELECT last_activity_at FROM posts WHERE id = ?", OffsetDateTime.class, parentPostId);

        assertThat(newCount).isEqualTo(1);
        assertThat(newLastActivity).isAfter(initialLastActivity);
    }

    // =========================================================================
    // POST not-found
    // =========================================================================

    @Test
    void postOnSoftDeletedParentPostReturns404() throws Exception {
        // Soft-delete the post directly.
        jdbc.update("UPDATE posts SET is_deleted = TRUE, deleted_at = NOW() WHERE id = ?",
                parentPostId);

        String body = """
                { "content": "Comment on deleted post." }
                """;
        mvc.perform(post("/api/v1/posts/" + parentPostId + "/comments")
                        .header("Authorization", "Bearer " + bobJwt)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body))
                .andExpect(status().isNotFound());
    }

    // =========================================================================
    // POST rate limiting
    // =========================================================================

    @Test
    void post30CommentsThen31stReturns429WithRetryAfter() throws Exception {
        // Per master plan: 30 writes per hour per user. The 31st must return 429
        // with Retry-After (seconds), the canonical RATE_LIMITED code, and the
        // anti-pressure copy from CommentsRateLimitException.formatMessage(...).
        // Spans the entire filter chain → controller → exception advice path,
        // which the unit-level CommentsRateLimitServiceTest cannot cover.
        String body = "{\"content\": \"Praying.\"}";

        for (int i = 0; i < 30; i++) {
            mvc.perform(post("/api/v1/posts/" + parentPostId + "/comments")
                            .header("Authorization", "Bearer " + bobJwt)
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(body))
                    .andExpect(status().isCreated());
        }

        mvc.perform(post("/api/v1/posts/" + parentPostId + "/comments")
                        .header("Authorization", "Bearer " + bobJwt)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body))
                .andExpect(status().isTooManyRequests())
                .andExpect(header().exists("Retry-After"))
                .andExpect(jsonPath("$.code").value("RATE_LIMITED"))
                .andExpect(jsonPath("$.message").value(
                        org.hamcrest.Matchers.containsString("commenting a lot")));
    }

    @Test
    void postRateLimitIsolatedPerUser() throws Exception {
        // Bucket map is keyed per-user UUID. One user exhausting their bucket
        // must NOT affect another user's bucket.
        String body = "{\"content\": \"Praying.\"}";

        for (int i = 0; i < 30; i++) {
            mvc.perform(post("/api/v1/posts/" + parentPostId + "/comments")
                            .header("Authorization", "Bearer " + bobJwt)
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(body))
                    .andExpect(status().isCreated());
        }

        // Bob's bucket is now empty. Alice's bucket is full — she can post.
        mvc.perform(post("/api/v1/posts/" + parentPostId + "/comments")
                        .header("Authorization", "Bearer " + aliceJwt)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body))
                .andExpect(status().isCreated());
    }

    // =========================================================================
    // POST AFTER_COMMIT contract — regression guard against listener phase change
    // =========================================================================

    @Test
    void crisisEventNotDispatchedWhenTransactionRollsBack() {
        // The CrisisDetectedEventListener uses
        //   @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
        // so an event published inside a transaction that ROLLS BACK is discarded
        // before the listener runs. If a future change flips the phase to BEFORE_COMMIT
        // or @Async, alerts would fire for content that never persisted — a real
        // safety regression. This test guards against that.
        //
        // We invoke createComment INSIDE a TransactionTemplate.execute(...) that
        // marks rollbackOnly. The service's @Transactional REQUIRED propagation
        // joins the outer txn; the publish queues; the outer rolls back; the
        // listener never runs. Verified by the spy on CrisisAlertService.

        UUID rollbackPostId = seedPostDirect(alice.getId(), "rollback-test parent post");

        try {
            txTemplate.execute(status -> {
                CreateCommentRequest req = new CreateCommentRequest(
                        "I want to die — please pray for me.", null);
                commentService.createComment(rollbackPostId, alice.getId(), req, null, "rid");
                status.setRollbackOnly();
                return null;
            });
        } catch (UnexpectedRollbackException ignored) {
            // Spring may surface this depending on the propagation context; either
            // way the txn rolled back, which is what we actually want to verify.
        }

        // The listener fires AFTER_COMMIT synchronously on the same thread that
        // commits. Since the txn rolled back, the listener never runs and the
        // spy's alert(...) is never invoked.
        verify(crisisAlertService, never())
                .alert(any(UUID.class), any(UUID.class), any(ContentType.class));

        // And no comment row persisted.
        Long commentCount = jdbc.queryForObject(
                "SELECT COUNT(*) FROM post_comments WHERE post_id = ?",
                Long.class, rollbackPostId);
        assertThat(commentCount).isZero();

        // And the parent's denormalized counter never incremented.
        Integer parentCommentCount = jdbc.queryForObject(
                "SELECT comment_count FROM posts WHERE id = ?",
                Integer.class, rollbackPostId);
        assertThat(parentCommentCount).isZero();
    }

    // =========================================================================
    // PATCH
    // =========================================================================

    @Test
    void patchWithinWindowSucceeds() throws Exception {
        // Create a comment.
        MvcResult create = mvc.perform(post("/api/v1/posts/" + parentPostId + "/comments")
                        .header("Authorization", "Bearer " + bobJwt)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"content\": \"original\"}"))
                .andExpect(status().isCreated())
                .andReturn();
        String commentId = mapper.readTree(create.getResponse().getContentAsString())
                .get("data").get("id").asText();

        // Edit immediately (well within window).
        mvc.perform(patch("/api/v1/comments/" + commentId)
                        .header("Authorization", "Bearer " + bobJwt)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"content\": \"updated\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.content").value("updated"));
    }

    @Test
    void patchAfterWindowReturns409() throws Exception {
        // Create then directly UPDATE created_at to 6 minutes ago.
        MvcResult create = mvc.perform(post("/api/v1/posts/" + parentPostId + "/comments")
                        .header("Authorization", "Bearer " + bobJwt)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"content\": \"original\"}"))
                .andExpect(status().isCreated())
                .andReturn();
        String commentId = mapper.readTree(create.getResponse().getContentAsString())
                .get("data").get("id").asText();

        OffsetDateTime sixMinutesAgo = OffsetDateTime.now(ZoneOffset.UTC).minusMinutes(6);
        jdbc.update("UPDATE post_comments SET created_at = ? WHERE id = CAST(? AS uuid)",
                sixMinutesAgo, commentId);

        mvc.perform(patch("/api/v1/comments/" + commentId)
                        .header("Authorization", "Bearer " + bobJwt)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"content\": \"too late edit\"}"))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.code").value("EDIT_WINDOW_EXPIRED"));
    }

    @Test
    void patchByNonAuthorReturns403() throws Exception {
        MvcResult create = mvc.perform(post("/api/v1/posts/" + parentPostId + "/comments")
                        .header("Authorization", "Bearer " + bobJwt)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"content\": \"bob's comment\"}"))
                .andExpect(status().isCreated())
                .andReturn();
        String commentId = mapper.readTree(create.getResponse().getContentAsString())
                .get("data").get("id").asText();

        // Alice tries to edit Bob's comment.
        mvc.perform(patch("/api/v1/comments/" + commentId)
                        .header("Authorization", "Bearer " + aliceJwt)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"content\": \"sneaky edit\"}"))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.code").value("FORBIDDEN"));
    }

    // =========================================================================
    // DELETE
    // =========================================================================

    @Test
    void deleteByAuthorReturns204AndDecrementsCounter() throws Exception {
        MvcResult create = mvc.perform(post("/api/v1/posts/" + parentPostId + "/comments")
                        .header("Authorization", "Bearer " + bobJwt)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"content\": \"to be deleted\"}"))
                .andExpect(status().isCreated())
                .andReturn();
        String commentId = mapper.readTree(create.getResponse().getContentAsString())
                .get("data").get("id").asText();

        Integer afterCreate = jdbc.queryForObject(
                "SELECT comment_count FROM posts WHERE id = ?", Integer.class, parentPostId);
        assertThat(afterCreate).isEqualTo(1);

        mvc.perform(delete("/api/v1/comments/" + commentId)
                        .header("Authorization", "Bearer " + bobJwt))
                .andExpect(status().isNoContent());

        Integer afterDelete = jdbc.queryForObject(
                "SELECT comment_count FROM posts WHERE id = ?", Integer.class, parentPostId);
        assertThat(afterDelete).isZero();

        Boolean isDeleted = jdbc.queryForObject(
                "SELECT is_deleted FROM post_comments WHERE id = CAST(? AS uuid)",
                Boolean.class, commentId);
        assertThat(isDeleted).isTrue();
    }

    @Test
    void deleteAlreadyDeletedByAuthorReturns204Idempotent() throws Exception {
        MvcResult create = mvc.perform(post("/api/v1/posts/" + parentPostId + "/comments")
                        .header("Authorization", "Bearer " + bobJwt)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"content\": \"double-delete\"}"))
                .andExpect(status().isCreated())
                .andReturn();
        String commentId = mapper.readTree(create.getResponse().getContentAsString())
                .get("data").get("id").asText();

        mvc.perform(delete("/api/v1/comments/" + commentId)
                        .header("Authorization", "Bearer " + bobJwt))
                .andExpect(status().isNoContent());

        // Second DELETE → still 204 (idempotent).
        mvc.perform(delete("/api/v1/comments/" + commentId)
                        .header("Authorization", "Bearer " + bobJwt))
                .andExpect(status().isNoContent());
    }

    @Test
    void deleteAlreadyDeletedByNonAuthorReturns403() throws Exception {
        // Spec D8 — 403 not 404 even when comment is already soft-deleted.
        MvcResult create = mvc.perform(post("/api/v1/posts/" + parentPostId + "/comments")
                        .header("Authorization", "Bearer " + bobJwt)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"content\": \"bob's deletable\"}"))
                .andExpect(status().isCreated())
                .andReturn();
        String commentId = mapper.readTree(create.getResponse().getContentAsString())
                .get("data").get("id").asText();

        // Bob deletes his own.
        mvc.perform(delete("/api/v1/comments/" + commentId)
                        .header("Authorization", "Bearer " + bobJwt))
                .andExpect(status().isNoContent());

        // Alice tries to delete it now.
        mvc.perform(delete("/api/v1/comments/" + commentId)
                        .header("Authorization", "Bearer " + aliceJwt))
                .andExpect(status().isForbidden());
    }

    @Test
    void deleteNonExistentCommentReturns404() throws Exception {
        mvc.perform(delete("/api/v1/comments/" + UUID.randomUUID())
                        .header("Authorization", "Bearer " + bobJwt))
                .andExpect(status().isNotFound());
    }
}
