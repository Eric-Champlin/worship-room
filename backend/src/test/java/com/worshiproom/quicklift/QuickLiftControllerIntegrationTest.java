package com.worshiproom.quicklift;

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
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;

import java.time.OffsetDateTime;
import java.util.UUID;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicInteger;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Spec 6.2 — end-to-end coverage of Quick Lift endpoints. Server-authoritative
 * timing is exercised by seeding {@code started_at} via direct JDBC so the
 * test runs in milliseconds (no Thread.sleep). The L1-cache regression guard
 * is on test {@link #start_validPostId_returns200WithSessionAndStartedAt}.
 */
@AutoConfigureMockMvc
class QuickLiftControllerIntegrationTest extends AbstractIntegrationTest {

    private static final String TEST_JWT_SECRET =
            "test-jwt-secret-at-least-32-bytes-long-xxxxxxxxxxxxxx";

    @DynamicPropertySource
    static void properties(DynamicPropertyRegistry registry) {
        registry.add("jwt.secret", () -> TEST_JWT_SECRET);
        registry.add("auth.rate-limit.per-email.capacity", () -> "1000");
        registry.add("auth.rate-limit.per-ip.capacity", () -> "10000");
        // Pin rate limits to test-deterministic values regardless of dev/prod defaults.
        registry.add("worshiproom.quicklift.start.requests-per-minute", () -> "10");
        registry.add("worshiproom.quicklift.complete.requests-per-minute", () -> "30");
    }

    @Autowired private MockMvc mvc;
    @Autowired private ObjectMapper mapper;
    @Autowired private UserRepository userRepository;
    @Autowired private JwtService jwtService;
    @Autowired private JdbcTemplate jdbc;
    @Autowired private QuickLiftCleanupJob cleanupJob;

    private User user;
    private User otherUser;
    private String jwt;
    private String otherJwt;

    @BeforeEach
    void clean() {
        jdbc.update("DELETE FROM quick_lift_sessions");
        jdbc.update("DELETE FROM activity_log");
        jdbc.update("DELETE FROM activity_counts");
        jdbc.update("DELETE FROM user_badges");
        jdbc.update("DELETE FROM faith_points");
        jdbc.update("DELETE FROM streak_state");
        jdbc.update("DELETE FROM post_comments");
        jdbc.update("DELETE FROM post_reactions");
        jdbc.update("DELETE FROM post_bookmarks");
        jdbc.update("DELETE FROM posts");
        jdbc.update("DELETE FROM users");
        user = userRepository.saveAndFlush(new User(
            "ql-test@example.com", "$2a$10$x", "Quick", "Lifter", "UTC"));
        otherUser = userRepository.saveAndFlush(new User(
            "ql-other@example.com", "$2a$10$x", "Other", "User", "UTC"));
        jwt = jwtService.generateToken(user.getId(), false);
        otherJwt = jwtService.generateToken(otherUser.getId(), false);
    }

    private UUID seedPost() {
        UUID id = UUID.randomUUID();
        jdbc.update("""
            INSERT INTO posts (id, user_id, post_type, content, visibility, moderation_status)
            VALUES (?, ?, 'prayer_request', 'please pray for me', 'public', 'approved')
            """, id, user.getId());
        return id;
    }

    private UUID seedPostOwnedBy(UUID owner) {
        UUID id = UUID.randomUUID();
        jdbc.update("""
            INSERT INTO posts (id, user_id, post_type, content, visibility, moderation_status)
            VALUES (?, ?, 'prayer_request', 'pray pls', 'public', 'approved')
            """, id, owner);
        return id;
    }

    private UUID seedSession(UUID userId, UUID postId, OffsetDateTime startedAt) {
        UUID id = UUID.randomUUID();
        jdbc.update("""
            INSERT INTO quick_lift_sessions (id, user_id, post_id, started_at)
            VALUES (?, ?, ?, ?)
            """, id, userId, postId, startedAt);
        return id;
    }

    private UUID seedTerminalSession(UUID userId, UUID postId, OffsetDateTime startedAt) {
        UUID id = UUID.randomUUID();
        jdbc.update("""
            INSERT INTO quick_lift_sessions (id, user_id, post_id, started_at, completed_at)
            VALUES (?, ?, ?, ?, ?)
            """, id, userId, postId, startedAt, startedAt.plusSeconds(31));
        return id;
    }

    private String startBody(UUID postId) {
        return "{\"postId\":\"" + postId + "\"}";
    }

    // ─── /start ────────────────────────────────────────────────────────────

    @Test
    void start_validPostId_returns200WithSessionAndStartedAt() throws Exception {
        UUID postId = seedPost();
        MvcResult res = mvc.perform(post("/api/v1/quick-lift/start")
                .header("Authorization", "Bearer " + jwt)
                .contentType(MediaType.APPLICATION_JSON)
                .content(startBody(postId)))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data.sessionId").exists())
            // L1-cache trap regression guard: serverStartedAt MUST be non-null
            // — Phase 3 Execution Reality Addendum item 2.
            .andExpect(jsonPath("$.data.serverStartedAt").exists())
            .andExpect(jsonPath("$.meta.requestId").exists())
            .andReturn();

        assertThat(res.getResponse().getContentAsString())
            .doesNotContain("\"serverStartedAt\":null");
        Integer rowCount = jdbc.queryForObject(
            "SELECT COUNT(*) FROM quick_lift_sessions WHERE user_id = ? AND post_id = ? "
            + "AND started_at IS NOT NULL AND completed_at IS NULL",
            Integer.class, user.getId(), postId);
        assertThat(rowCount).isEqualTo(1);
    }

    @Test
    void start_unauthenticated_returns401() throws Exception {
        UUID postId = seedPost();
        mvc.perform(post("/api/v1/quick-lift/start")
                .contentType(MediaType.APPLICATION_JSON)
                .content(startBody(postId)))
            .andExpect(status().isUnauthorized());
    }

    @Test
    void start_nonExistentPost_returns404() throws Exception {
        UUID randomPostId = UUID.randomUUID();
        mvc.perform(post("/api/v1/quick-lift/start")
                .header("Authorization", "Bearer " + jwt)
                .contentType(MediaType.APPLICATION_JSON)
                .content(startBody(randomPostId)))
            .andExpect(status().isNotFound())
            .andExpect(jsonPath("$.code").value("NOT_FOUND"));
    }

    @Test
    void start_activeSessionExists_returns409() throws Exception {
        UUID postId = seedPost();
        seedSession(user.getId(), postId, OffsetDateTime.now().minusSeconds(5));
        mvc.perform(post("/api/v1/quick-lift/start")
                .header("Authorization", "Bearer " + jwt)
                .contentType(MediaType.APPLICATION_JSON)
                .content(startBody(postId)))
            .andExpect(status().isConflict())
            .andExpect(jsonPath("$.code").value("ACTIVE_SESSION_EXISTS"));
    }

    @Test
    void start_userOwnsThePost_returns200() throws Exception {
        UUID ownPostId = seedPostOwnedBy(user.getId());
        mvc.perform(post("/api/v1/quick-lift/start")
                .header("Authorization", "Bearer " + jwt)
                .contentType(MediaType.APPLICATION_JSON)
                .content(startBody(ownPostId)))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data.sessionId").exists());
    }

    @Test
    void start_eleventhRequestInOneMinute_returns429() throws Exception {
        // Capacity pinned to 10/min by @DynamicPropertySource above. Burst into 11 rapid starts.
        for (int i = 0; i < 10; i++) {
            UUID p = seedPost();
            mvc.perform(post("/api/v1/quick-lift/start")
                    .header("Authorization", "Bearer " + jwt)
                    .contentType(MediaType.APPLICATION_JSON)
                    .content(startBody(p)))
                .andExpect(status().isOk());
        }
        UUID p11 = seedPost();
        mvc.perform(post("/api/v1/quick-lift/start")
                .header("Authorization", "Bearer " + jwt)
                .contentType(MediaType.APPLICATION_JSON)
                .content(startBody(p11)))
            .andExpect(status().isTooManyRequests())
            .andExpect(jsonPath("$.code").value("QUICK_LIFT_START_RATE_LIMITED"))
            .andExpect(header().exists("Retry-After"));
    }

    // ─── /complete ─────────────────────────────────────────────────────────

    @Test
    void complete_atTwentyNineSeconds_returns400TimingTooEarly() throws Exception {
        UUID postId = seedPost();
        UUID sessionId = seedSession(user.getId(), postId,
            OffsetDateTime.now().minusSeconds(29));
        mvc.perform(post("/api/v1/quick-lift/{id}/complete", sessionId)
                .header("Authorization", "Bearer " + jwt))
            .andExpect(status().isBadRequest())
            .andExpect(jsonPath("$.code").value("TIMING_TOO_EARLY"));

        Integer count = jdbc.queryForObject(
            "SELECT COUNT(*) FROM quick_lift_sessions WHERE id = ? AND completed_at IS NULL",
            Integer.class, sessionId);
        assertThat(count).isEqualTo(1);
    }

    @Test
    void complete_atThirtySeconds_returns200WithActivityRecorded() throws Exception {
        UUID postId = seedPost();
        UUID sessionId = seedSession(user.getId(), postId,
            OffsetDateTime.now().minusSeconds(31));
        mvc.perform(post("/api/v1/quick-lift/{id}/complete", sessionId)
                .header("Authorization", "Bearer " + jwt))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data.activityRecorded").value(true))
            .andExpect(jsonPath("$.data.pointsAwarded").exists())
            .andExpect(jsonPath("$.data.badgesUnlocked").isArray());

        Integer completedCount = jdbc.queryForObject(
            "SELECT COUNT(*) FROM quick_lift_sessions WHERE id = ? AND completed_at IS NOT NULL",
            Integer.class, sessionId);
        assertThat(completedCount).isEqualTo(1);

        Integer activityCount = jdbc.queryForObject(
            "SELECT COUNT(*) FROM activity_log WHERE user_id = ? AND activity_type = 'quickLift'",
            Integer.class, user.getId());
        assertThat(activityCount).isEqualTo(1);

        Integer counterValue = jdbc.queryForObject(
            "SELECT count_value FROM activity_counts WHERE user_id = ? AND count_type = 'quickLift'",
            Integer.class, user.getId());
        assertThat(counterValue).isEqualTo(1);
    }

    @Test
    void complete_alreadyCompletedSession_returns409AlreadyCompleted() throws Exception {
        UUID postId = seedPost();
        UUID sessionId = seedTerminalSession(user.getId(), postId,
            OffsetDateTime.now().minusMinutes(2));
        mvc.perform(post("/api/v1/quick-lift/{id}/complete", sessionId)
                .header("Authorization", "Bearer " + jwt))
            .andExpect(status().isConflict())
            .andExpect(jsonPath("$.code").value("ALREADY_COMPLETED"));
    }

    @Test
    void complete_sessionBelongingToDifferentUser_returns403() throws Exception {
        UUID postId = seedPost();
        UUID sessionId = seedSession(user.getId(), postId,
            OffsetDateTime.now().minusSeconds(31));
        mvc.perform(post("/api/v1/quick-lift/{id}/complete", sessionId)
                .header("Authorization", "Bearer " + otherJwt))
            .andExpect(status().isForbidden())
            .andExpect(jsonPath("$.code").value("FORBIDDEN"));
    }

    @Test
    void complete_nonExistentSessionId_returns404() throws Exception {
        UUID random = UUID.randomUUID();
        mvc.perform(post("/api/v1/quick-lift/{id}/complete", random)
                .header("Authorization", "Bearer " + jwt))
            .andExpect(status().isNotFound())
            .andExpect(jsonPath("$.code").value("NOT_FOUND"));
    }

    @Test
    void complete_tenthCompletion_unlocksFaithfulWatcher() throws Exception {
        // Seed user with 9 prior Quick Lift completions in the counter.
        jdbc.update("""
            INSERT INTO activity_counts (user_id, count_type, count_value, last_updated)
            VALUES (?, ?, ?, NOW())
            """, user.getId(), "quickLift", 9);

        UUID postId = seedPost();
        UUID sessionId = seedSession(user.getId(), postId,
            OffsetDateTime.now().minusSeconds(31));
        mvc.perform(post("/api/v1/quick-lift/{id}/complete", sessionId)
                .header("Authorization", "Bearer " + jwt))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data.badgesUnlocked[?(@.id == 'faithful_watcher')]").exists());

        Integer badgeCount = jdbc.queryForObject(
            "SELECT COUNT(*) FROM user_badges WHERE user_id = ? AND badge_id = 'faithful_watcher'",
            Integer.class, user.getId());
        assertThat(badgeCount).isEqualTo(1);
    }

    @Test
    void complete_eleventhCompletion_doesNotRefireFaithfulWatcher() throws Exception {
        // Seed user with 10 prior completions and already-earned faithful_watcher.
        jdbc.update("""
            INSERT INTO activity_counts (user_id, count_type, count_value, last_updated)
            VALUES (?, ?, ?, NOW())
            """, user.getId(), "quickLift", 10);
        jdbc.update("""
            INSERT INTO user_badges (user_id, badge_id, earned_at)
            VALUES (?, 'faithful_watcher', NOW())
            """, user.getId());

        UUID postId = seedPost();
        UUID sessionId = seedSession(user.getId(), postId,
            OffsetDateTime.now().minusSeconds(31));
        mvc.perform(post("/api/v1/quick-lift/{id}/complete", sessionId)
                .header("Authorization", "Bearer " + jwt))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data.badgesUnlocked[?(@.id == 'faithful_watcher')]").doesNotExist());
    }

    // ─── Anti-farming ──────────────────────────────────────────────────────

    @Test
    void complete_serverClockManipulation_rejects() throws Exception {
        // 5 seconds elapsed only — DB clock authoritative.
        UUID postId = seedPost();
        UUID sessionId = seedSession(user.getId(), postId,
            OffsetDateTime.now().minusSeconds(5));
        mvc.perform(post("/api/v1/quick-lift/{id}/complete", sessionId)
                .header("Authorization", "Bearer " + jwt))
            .andExpect(status().isBadRequest())
            .andExpect(jsonPath("$.code").value("TIMING_TOO_EARLY"));
    }

    @Test
    void complete_concurrentAttempts_exactlyOneSucceeds() throws Exception {
        UUID postId = seedPost();
        UUID sessionId = seedSession(user.getId(), postId,
            OffsetDateTime.now().minusSeconds(31));

        int threads = 10;
        ExecutorService exec = Executors.newFixedThreadPool(threads);
        AtomicInteger success = new AtomicInteger();
        AtomicInteger conflict = new AtomicInteger();
        java.util.concurrent.CountDownLatch start = new java.util.concurrent.CountDownLatch(1);
        java.util.concurrent.CountDownLatch done = new java.util.concurrent.CountDownLatch(threads);

        for (int i = 0; i < threads; i++) {
            exec.submit(() -> {
                try {
                    start.await();
                    int status = mvc.perform(post("/api/v1/quick-lift/{id}/complete", sessionId)
                            .header("Authorization", "Bearer " + jwt))
                        .andReturn().getResponse().getStatus();
                    if (status == 200) success.incrementAndGet();
                    else if (status == 409) conflict.incrementAndGet();
                } catch (Exception ignored) {
                } finally {
                    done.countDown();
                }
            });
        }
        start.countDown();
        done.await(15, TimeUnit.SECONDS);
        exec.shutdownNow();

        assertThat(success.get())
            .as("exactly one parallel /complete call should succeed")
            .isEqualTo(1);
        assertThat(success.get() + conflict.get()).isEqualTo(threads);
    }

    // ─── Cleanup job ───────────────────────────────────────────────────────

    @Test
    void cleanup_abandonedSessionOlderThanFiveMinutes_isPruned() {
        UUID postId = seedPost();
        UUID sessionId = seedSession(user.getId(), postId,
            OffsetDateTime.now().minusMinutes(6));

        cleanupJob.cleanup();

        Integer count = jdbc.queryForObject(
            "SELECT COUNT(*) FROM quick_lift_sessions WHERE id = ?",
            Integer.class, sessionId);
        assertThat(count).isZero();
    }

    @Test
    void cleanup_recentAbandonedSessionUnderFiveMinutes_isNotPruned() {
        UUID postId = seedPost();
        UUID sessionId = seedSession(user.getId(), postId,
            OffsetDateTime.now().minusMinutes(3));

        cleanupJob.cleanup();

        Integer count = jdbc.queryForObject(
            "SELECT COUNT(*) FROM quick_lift_sessions WHERE id = ?",
            Integer.class, sessionId);
        assertThat(count).isEqualTo(1);
    }

    @Test
    void cleanup_completedSession_isNotPruned() {
        UUID postId = seedPost();
        UUID sessionId = seedTerminalSession(user.getId(), postId,
            OffsetDateTime.now().minusHours(1));

        cleanupJob.cleanup();

        Integer count = jdbc.queryForObject(
            "SELECT COUNT(*) FROM quick_lift_sessions WHERE id = ?",
            Integer.class, sessionId);
        assertThat(count).isEqualTo(1);
    }
}
