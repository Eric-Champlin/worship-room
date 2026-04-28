package com.worshiproom.post.engagement;

import com.worshiproom.auth.JwtService;
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

import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Spec 3.7 — end-to-end HTTP coverage of {@code POST /api/v1/posts/{id}/bookmark} and
 * {@code DELETE /api/v1/posts/{id}/bookmark}. Same shape as
 * {@link ReactionWriteIntegrationTest}, but bookmarks split POST/DELETE (no toggle) and
 * NEVER fire activity events.
 *
 * <p>Rate-limit override: {@code max-per-hour=3} sized so:
 *   (a) most tests need ≤2 token-consuming calls;
 *   (b) the rate-limit test fires 4 calls (3 succeed, 4th is 429).
 */
@AutoConfigureMockMvc
class BookmarkWriteIntegrationTest extends AbstractIntegrationTest {

    private static final String TEST_JWT_SECRET =
            "test-jwt-secret-at-least-32-bytes-long-xxxxxxxxxxxxxx";

    @DynamicPropertySource
    static void properties(DynamicPropertyRegistry registry) {
        registry.add("jwt.secret", () -> TEST_JWT_SECRET);
        registry.add("auth.rate-limit.per-email.capacity", () -> "1000");
        registry.add("auth.rate-limit.per-ip.capacity", () -> "10000");
        registry.add("worshiproom.bookmarks.rate-limit.max-per-hour", () -> "3");
    }

    @Autowired private MockMvc mvc;
    @Autowired private UserRepository userRepository;
    @Autowired private JwtService jwtService;
    @Autowired private JdbcTemplate jdbc;

    private User alice;
    private User bob;
    private UUID alicePostId;
    private String aliceJwt;

    @BeforeEach
    void seed() {
        jdbc.update("DELETE FROM activity_log");
        jdbc.update("DELETE FROM friend_relationships");
        jdbc.update("DELETE FROM post_reactions");
        jdbc.update("DELETE FROM post_bookmarks");
        jdbc.update("DELETE FROM post_comments");
        jdbc.update("DELETE FROM posts");
        jdbc.update("DELETE FROM users");

        alice = userRepository.saveAndFlush(new User("alice-bm-int@test.local", "$2a$10$x",
                "Alice", "Anderson", "UTC"));
        bob = userRepository.saveAndFlush(new User("bob-bm-int@test.local", "$2a$10$x",
                "Bob", "Bennett", "UTC"));
        aliceJwt = jwtService.generateToken(alice.getId(), false);

        alicePostId = seedPost(alice.getId(), "public", false);
    }

    private UUID seedPost(UUID userId, String visibility, boolean deleted) {
        UUID id = UUID.randomUUID();
        jdbc.update("""
                INSERT INTO posts (id, user_id, post_type, content, visibility, moderation_status,
                                   is_deleted, deleted_at)
                VALUES (?, ?, 'prayer_request', 'bm int test', ?, 'approved', ?, ?)
                """, id, userId, visibility, deleted,
                deleted ? java.time.OffsetDateTime.now() : null);
        return id;
    }

    // ─── 1. Add when absent → 201 ─────────────────────────────────────────────

    @Test
    void addBookmark_whenAbsent_returns201WithBookmarkedTrue() throws Exception {
        mvc.perform(post("/api/v1/posts/{id}/bookmark", alicePostId)
                        .header("Authorization", "Bearer " + aliceJwt))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.data.bookmarked").value(true))
                .andExpect(jsonPath("$.data.bookmarkCount").value(1))
                .andExpect(jsonPath("$.meta.requestId").exists());
    }

    // ─── 2. Idempotent re-add → 200 ───────────────────────────────────────────

    @Test
    void addBookmark_whenAlreadyPresent_returns200Idempotent() throws Exception {
        mvc.perform(post("/api/v1/posts/{id}/bookmark", alicePostId)
                        .header("Authorization", "Bearer " + aliceJwt))
                .andExpect(status().isCreated());
        mvc.perform(post("/api/v1/posts/{id}/bookmark", alicePostId)
                        .header("Authorization", "Bearer " + aliceJwt))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.bookmarked").value(true))
                .andExpect(jsonPath("$.data.bookmarkCount").value(1));  // NOT 2
    }

    // ─── 3. Anonymous → 401 ───────────────────────────────────────────────────

    @Test
    void addBookmark_anonymous_returns401() throws Exception {
        mvc.perform(post("/api/v1/posts/{id}/bookmark", alicePostId))
                .andExpect(status().isUnauthorized());
    }

    // ─── 4. Invalid JWT → 401 ─────────────────────────────────────────────────

    @Test
    void addBookmark_invalidJwt_returns401() throws Exception {
        mvc.perform(post("/api/v1/posts/{id}/bookmark", alicePostId)
                        .header("Authorization", "Bearer not-a-real-jwt-token"))
                .andExpect(status().isUnauthorized());
    }

    // ─── 5. Soft-deleted post → 404 ───────────────────────────────────────────

    @Test
    void addBookmark_softDeletedPost_returns404() throws Exception {
        UUID deletedId = seedPost(alice.getId(), "public", true);
        mvc.perform(post("/api/v1/posts/{id}/bookmark", deletedId)
                        .header("Authorization", "Bearer " + aliceJwt))
                .andExpect(status().isNotFound());
    }

    // ─── 6. Private post by other user → 404 (anti-enumeration) ───────────────

    @Test
    void addBookmark_privatePostByOtherUser_returns404() throws Exception {
        UUID privateBobsPost = seedPost(bob.getId(), "private", false);
        mvc.perform(post("/api/v1/posts/{id}/bookmark", privateBobsPost)
                        .header("Authorization", "Bearer " + aliceJwt))
                .andExpect(status().isNotFound());
    }

    // ─── 7. Rate limit exceeded → 429 with Retry-After ────────────────────────

    @Test
    void addBookmark_rateLimitExceeded_returns429WithRetryAfter() throws Exception {
        // max-per-hour=3 (set in @DynamicPropertySource).
        // Calls 1-3 succeed (1st = 201 newly added; 2nd-3rd = 200 idempotent no-ops on same post).
        mvc.perform(post("/api/v1/posts/{id}/bookmark", alicePostId)
                        .header("Authorization", "Bearer " + aliceJwt))
                .andExpect(status().isCreated());
        mvc.perform(post("/api/v1/posts/{id}/bookmark", alicePostId)
                        .header("Authorization", "Bearer " + aliceJwt))
                .andExpect(status().isOk());
        mvc.perform(post("/api/v1/posts/{id}/bookmark", alicePostId)
                        .header("Authorization", "Bearer " + aliceJwt))
                .andExpect(status().isOk());
        var result = mvc.perform(post("/api/v1/posts/{id}/bookmark", alicePostId)
                        .header("Authorization", "Bearer " + aliceJwt))
                .andExpect(status().isTooManyRequests())
                .andExpect(jsonPath("$.code").value("RATE_LIMITED"))
                .andExpect(header().exists("Retry-After"))
                .andReturn();
        long retryAfter = Long.parseLong(result.getResponse().getHeader("Retry-After"));
        assertThat(retryAfter).isPositive();
    }

    // ─── 8. Bookmarks NEVER fire activity ─────────────────────────────────────

    @Test
    void addBookmark_neverFiresActivity() throws Exception {
        mvc.perform(post("/api/v1/posts/{id}/bookmark", alicePostId)
                        .header("Authorization", "Bearer " + aliceJwt))
                .andExpect(status().isCreated());
        mvc.perform(delete("/api/v1/posts/{id}/bookmark", alicePostId)
                        .header("Authorization", "Bearer " + aliceJwt))
                .andExpect(status().isNoContent());

        Integer count = jdbc.queryForObject(
                "SELECT COUNT(*) FROM activity_log WHERE user_id = ?",
                Integer.class, alice.getId());
        assertThat(count).isZero();
    }

    // ─── 9. DELETE is idempotent ──────────────────────────────────────────────

    @Test
    void deleteBookmark_isIdempotent() throws Exception {
        // a) DELETE before any add — no row exists, still 204.
        mvc.perform(delete("/api/v1/posts/{id}/bookmark", alicePostId)
                        .header("Authorization", "Bearer " + aliceJwt))
                .andExpect(status().isNoContent());

        // b) Add then DELETE — row removed, 204.
        mvc.perform(post("/api/v1/posts/{id}/bookmark", alicePostId)
                        .header("Authorization", "Bearer " + aliceJwt))
                .andExpect(status().isCreated());
        mvc.perform(delete("/api/v1/posts/{id}/bookmark", alicePostId)
                        .header("Authorization", "Bearer " + aliceJwt))
                .andExpect(status().isNoContent());
    }
}
