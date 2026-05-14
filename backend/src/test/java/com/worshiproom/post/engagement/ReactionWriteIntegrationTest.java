package com.worshiproom.post.engagement;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.worshiproom.auth.JwtService;
import com.worshiproom.post.engagement.dto.ToggleReactionRequest;
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

import java.util.Map;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Spec 3.7 — end-to-end HTTP coverage of {@code POST /api/v1/posts/{id}/reactions} and
 * {@code DELETE /api/v1/posts/{id}/reactions}. Exercises the full filter chain including
 * Spring Security auth gating, MVC validation, the package-scoped engagement advice,
 * the validation advice (inherited from package-scoped {@code PostValidationExceptionHandler}),
 * and the real Testcontainers PostgreSQL.
 *
 * <p>Rate-limit override: {@code max-per-hour=2} so the 3rd toggle exercises the 429 path
 * within a single test. Mirrors the Spec 3.6 {@code CommentWriteIntegrationTest} JWT and
 * property-override pattern.
 */
@AutoConfigureMockMvc
class ReactionWriteIntegrationTest extends AbstractIntegrationTest {

    private static final String TEST_JWT_SECRET =
            "test-jwt-secret-at-least-32-bytes-long-xxxxxxxxxxxxxx";

    @DynamicPropertySource
    static void properties(DynamicPropertyRegistry registry) {
        registry.add("jwt.secret", () -> TEST_JWT_SECRET);
        registry.add("auth.rate-limit.per-email.capacity", () -> "1000");
        registry.add("auth.rate-limit.per-ip.capacity", () -> "10000");
        // Reaction rate limit sized so:
        //  (a) the per-test budget covers the worst-case test (DELETE-explicit, 3 token-consuming calls);
        //  (b) the rate-limit test can deliberately exceed the bucket within a single test
        //      by issuing 4 token-consuming calls (4th expects 429).
        // Keeping max small is intentional — exercises the 429 path quickly.
        registry.add("worshiproom.reactions.rate-limit.max-per-hour", () -> "3");
    }

    @Autowired private MockMvc mvc;
    @Autowired private ObjectMapper mapper;
    @Autowired private UserRepository userRepository;
    @Autowired private JwtService jwtService;
    @Autowired private JdbcTemplate jdbc;

    private User alice;
    private User bob;
    private UUID alicePostId;
    private String aliceJwt;
    private String bobJwt;

    @BeforeEach
    void seed() {
        jdbc.update("DELETE FROM activity_log");
        jdbc.update("DELETE FROM friend_relationships");
        jdbc.update("DELETE FROM post_reactions");
        jdbc.update("DELETE FROM post_bookmarks");
        jdbc.update("DELETE FROM post_comments");
        jdbc.update("DELETE FROM posts");
        jdbc.update("DELETE FROM users");

        alice = userRepository.saveAndFlush(new User("alice-rxn-int@test.local", "$2a$10$x",
                "Alice", "Anderson", "UTC"));
        bob = userRepository.saveAndFlush(new User("bob-rxn-int@test.local", "$2a$10$x",
                "Bob", "Bennett", "UTC"));
        aliceJwt = jwtService.generateToken(alice.getId(), false);
        bobJwt = jwtService.generateToken(bob.getId(), false);

        alicePostId = seedPost(alice.getId(), "public", false);
    }

    private UUID seedPost(UUID userId, String visibility, boolean deleted) {
        UUID id = UUID.randomUUID();
        jdbc.update("""
                INSERT INTO posts (id, user_id, post_type, content, visibility, moderation_status,
                                   is_deleted, deleted_at)
                VALUES (?, ?, 'prayer_request', 'reaction int test', ?, 'approved', ?, ?)
                """, id, userId, visibility, deleted,
                deleted ? java.time.OffsetDateTime.now() : null);
        return id;
    }

    private String body(String reactionType) throws Exception {
        return mapper.writeValueAsString(new ToggleReactionRequest(reactionType));
    }

    // ─── 1. Toggle add path ─────────────────────────────────────────────────

    @Test
    void togglePraying_addPath_returns201WithStateAdded() throws Exception {
        mvc.perform(post("/api/v1/posts/{id}/reactions", alicePostId)
                        .header("Authorization", "Bearer " + aliceJwt)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body("praying")))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.data.reactionType").value("praying"))
                .andExpect(jsonPath("$.data.state").value("added"))
                .andExpect(jsonPath("$.data.prayingCount").value(1))
                .andExpect(jsonPath("$.data.candleCount").value(0))
                .andExpect(jsonPath("$.meta.requestId").exists());
    }

    // ─── 2. Toggle remove path ──────────────────────────────────────────────

    @Test
    void togglePraying_removePath_returns200WithStateRemoved() throws Exception {
        // Prime: add first.
        mvc.perform(post("/api/v1/posts/{id}/reactions", alicePostId)
                        .header("Authorization", "Bearer " + aliceJwt)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body("praying")))
                .andExpect(status().isCreated());

        // Second toggle: remove.
        mvc.perform(post("/api/v1/posts/{id}/reactions", alicePostId)
                        .header("Authorization", "Bearer " + aliceJwt)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body("praying")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.state").value("removed"))
                .andExpect(jsonPath("$.data.prayingCount").value(0));
    }

    // ─── 3. Independent toggle types ────────────────────────────────────────

    @Test
    void toggleCandle_independentFromPraying() throws Exception {
        mvc.perform(post("/api/v1/posts/{id}/reactions", alicePostId)
                        .header("Authorization", "Bearer " + aliceJwt)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body("praying")))
                .andExpect(status().isCreated());
        mvc.perform(post("/api/v1/posts/{id}/reactions", alicePostId)
                        .header("Authorization", "Bearer " + aliceJwt)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body("candle")))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.data.reactionType").value("candle"))
                .andExpect(jsonPath("$.data.state").value("added"))
                .andExpect(jsonPath("$.data.prayingCount").value(1))
                .andExpect(jsonPath("$.data.candleCount").value(1));
    }

    // ─── 4. Validation: missing reactionType (empty body) ───────────────────

    @Test
    void togglePraying_missingReactionType_returns400() throws Exception {
        mvc.perform(post("/api/v1/posts/{id}/reactions", alicePostId)
                        .header("Authorization", "Bearer " + aliceJwt)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("INVALID_INPUT"));
    }

    // ─── 5. Validation: invalid reactionType value ──────────────────────────

    @Test
    void togglePraying_invalidReactionType_returns400() throws Exception {
        // 'heart' is not in the @Pattern. The @Pattern catches it BEFORE the DB CHECK
        // would fire (which would return a 500). 400 INVALID_INPUT is the only valid
        // outcome here per Spec 3.7 R12.
        mvc.perform(post("/api/v1/posts/{id}/reactions", alicePostId)
                        .header("Authorization", "Bearer " + aliceJwt)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(mapper.writeValueAsString(Map.of("reactionType", "heart"))))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("INVALID_INPUT"));
    }

    // ─── 6. Auth: anonymous → 401 ────────────────────────────────────────────

    @Test
    void togglePraying_anonymous_returns401() throws Exception {
        mvc.perform(post("/api/v1/posts/{id}/reactions", alicePostId)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body("praying")))
                .andExpect(status().isUnauthorized());
    }

    // ─── 7. Visibility: soft-deleted post → 404 ──────────────────────────────

    @Test
    void togglePraying_softDeletedPost_returns404() throws Exception {
        UUID deletedId = seedPost(alice.getId(), "public", true);
        mvc.perform(post("/api/v1/posts/{id}/reactions", deletedId)
                        .header("Authorization", "Bearer " + aliceJwt)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body("praying")))
                .andExpect(status().isNotFound());
    }

    // ─── 8. Visibility: private post by other user → 404 (anti-enumeration) ──

    @Test
    void togglePraying_privatePostByOtherUser_returns404() throws Exception {
        UUID privateBobsPost = seedPost(bob.getId(), "private", false);
        mvc.perform(post("/api/v1/posts/{id}/reactions", privateBobsPost)
                        .header("Authorization", "Bearer " + aliceJwt)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body("praying")))
                .andExpect(status().isNotFound());
    }

    // ─── 9. Rate limit: 3rd call returns 429 with Retry-After ────────────────

    @Test
    void togglePraying_rateLimitExceeded_returns429WithRetryAfter() throws Exception {
        // max-per-hour=3 (set in @DynamicPropertySource above) — fire 4 toggles.
        // Toggle 1: ADD → 201. Toggle 2: REMOVE → 200. Toggle 3: ADD → 201.
        // Toggle 4: bucket exhausted → 429.
        mvc.perform(post("/api/v1/posts/{id}/reactions", alicePostId)
                        .header("Authorization", "Bearer " + aliceJwt)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body("praying")))
                .andExpect(status().isCreated());
        mvc.perform(post("/api/v1/posts/{id}/reactions", alicePostId)
                        .header("Authorization", "Bearer " + aliceJwt)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body("praying")))
                .andExpect(status().isOk());
        mvc.perform(post("/api/v1/posts/{id}/reactions", alicePostId)
                        .header("Authorization", "Bearer " + aliceJwt)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body("praying")))
                .andExpect(status().isCreated());
        var result = mvc.perform(post("/api/v1/posts/{id}/reactions", alicePostId)
                        .header("Authorization", "Bearer " + aliceJwt)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body("praying")))
                .andExpect(status().isTooManyRequests())
                .andExpect(jsonPath("$.code").value("RATE_LIMITED"))
                .andExpect(header().exists("Retry-After"))
                .andReturn();
        long retryAfter = Long.parseLong(result.getResponse().getHeader("Retry-After"));
        assertThat(retryAfter).isPositive();
    }

    // ─── 10. Activity engine: ADD fires INTERCESSION ──────────────────────────

    @Test
    void togglePraying_addPath_firesIntercessionActivity() throws Exception {
        mvc.perform(post("/api/v1/posts/{id}/reactions", alicePostId)
                        .header("Authorization", "Bearer " + aliceJwt)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body("praying")))
                .andExpect(status().isCreated());

        Integer count = jdbc.queryForObject(
                "SELECT COUNT(*) FROM activity_log WHERE user_id = ? " +
                "AND activity_type = 'intercession' AND source_feature = 'prayer-wall-reaction'",
                Integer.class, alice.getId());
        assertThat(count).isEqualTo(1);
    }

    // ─── 11. Activity engine: REMOVE does NOT fire ────────────────────────────

    @Test
    void togglePraying_removePath_doesNotFireActivity() throws Exception {
        // ADD then REMOVE on same reactionType — final activity_log size should be 1.
        mvc.perform(post("/api/v1/posts/{id}/reactions", alicePostId)
                        .header("Authorization", "Bearer " + aliceJwt)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body("praying")))
                .andExpect(status().isCreated());
        mvc.perform(post("/api/v1/posts/{id}/reactions", alicePostId)
                        .header("Authorization", "Bearer " + aliceJwt)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body("praying")))
                .andExpect(status().isOk());

        Integer count = jdbc.queryForObject(
                "SELECT COUNT(*) FROM activity_log WHERE user_id = ?",
                Integer.class, alice.getId());
        assertThat(count).isEqualTo(1);  // only the ADD fired
    }

    // ─── 12. Explicit DELETE: idempotent + missing-param 400 ──────────────────

    @Test
    void deleteReaction_explicitWithType_isIdempotentAndRequiresType() throws Exception {
        // a) Idempotent when no row exists yet.
        mvc.perform(delete("/api/v1/posts/{id}/reactions", alicePostId)
                        .header("Authorization", "Bearer " + aliceJwt)
                        .param("reactionType", "praying"))
                .andExpect(status().isNoContent());

        // b) Add then explicit DELETE — still 204.
        mvc.perform(post("/api/v1/posts/{id}/reactions", alicePostId)
                        .header("Authorization", "Bearer " + aliceJwt)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body("praying")))
                .andExpect(status().isCreated());
        mvc.perform(delete("/api/v1/posts/{id}/reactions", alicePostId)
                        .header("Authorization", "Bearer " + aliceJwt)
                        .param("reactionType", "praying"))
                .andExpect(status().isNoContent());

        // c) Missing query param → 400 INVALID_INPUT (handled by PostValidationExceptionHandler
        // via MissingServletRequestParameterException — package-scoped to com.worshiproom.post).
        mvc.perform(delete("/api/v1/posts/{id}/reactions", alicePostId)
                        .header("Authorization", "Bearer " + aliceJwt))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("INVALID_INPUT"));
    }

    // ─── Spec 6.6 — 'praising' reaction write paths ────────────────────────────

    @Test
    void togglePraising_addPath_returns201WithStateAddedAndAllThreeCounts() throws Exception {
        // ADD path: insert reaction, increment praising_count, return all three counters.
        mvc.perform(post("/api/v1/posts/{id}/reactions", alicePostId)
                        .header("Authorization", "Bearer " + aliceJwt)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body("praising")))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.data.reactionType").value("praising"))
                .andExpect(jsonPath("$.data.state").value("added"))
                .andExpect(jsonPath("$.data.prayingCount").value(0))
                .andExpect(jsonPath("$.data.candleCount").value(0))
                .andExpect(jsonPath("$.data.praisingCount").value(1));

        Integer rows = jdbc.queryForObject(
                "SELECT COUNT(*) FROM post_reactions WHERE post_id = ? AND user_id = ? AND reaction_type = 'praising'",
                Integer.class, alicePostId, alice.getId());
        assertThat(rows).isEqualTo(1);

        Integer praisingCount = jdbc.queryForObject(
                "SELECT praising_count FROM posts WHERE id = ?", Integer.class, alicePostId);
        assertThat(praisingCount).isEqualTo(1);
    }

    @Test
    void togglePraising_removePath_returns200WithStateRemovedAndDecrementsCounter() throws Exception {
        // ADD then toggle again → REMOVE.
        mvc.perform(post("/api/v1/posts/{id}/reactions", alicePostId)
                        .header("Authorization", "Bearer " + aliceJwt)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body("praising")))
                .andExpect(status().isCreated());
        mvc.perform(post("/api/v1/posts/{id}/reactions", alicePostId)
                        .header("Authorization", "Bearer " + aliceJwt)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body("praising")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.state").value("removed"))
                .andExpect(jsonPath("$.data.praisingCount").value(0));

        Integer rows = jdbc.queryForObject(
                "SELECT COUNT(*) FROM post_reactions WHERE post_id = ? AND user_id = ? AND reaction_type = 'praising'",
                Integer.class, alicePostId, alice.getId());
        assertThat(rows).isEqualTo(0);

        Integer praisingCount = jdbc.queryForObject(
                "SELECT praising_count FROM posts WHERE id = ?", Integer.class, alicePostId);
        assertThat(praisingCount).isEqualTo(0);
    }

    @Test
    void deleteReactionPraising_explicit_isIdempotent() throws Exception {
        // DELETE on non-existent row → 204 (idempotent).
        mvc.perform(delete("/api/v1/posts/{id}/reactions", alicePostId)
                        .header("Authorization", "Bearer " + aliceJwt)
                        .param("reactionType", "praising"))
                .andExpect(status().isNoContent());

        // ADD then DELETE → 204, counter back to 0.
        mvc.perform(post("/api/v1/posts/{id}/reactions", alicePostId)
                        .header("Authorization", "Bearer " + aliceJwt)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body("praising")))
                .andExpect(status().isCreated());
        mvc.perform(delete("/api/v1/posts/{id}/reactions", alicePostId)
                        .header("Authorization", "Bearer " + aliceJwt)
                        .param("reactionType", "praising"))
                .andExpect(status().isNoContent());

        Integer praisingCount = jdbc.queryForObject(
                "SELECT praising_count FROM posts WHERE id = ?", Integer.class, alicePostId);
        assertThat(praisingCount).isEqualTo(0);
    }

    @Test
    void togglePraising_onNonAnsweredPost_succeeds_dbPermissive() throws Exception {
        // Spec 6.6 D-PraisingScope (R7): the CHECK constraint allows 'praising' on
        // any post; UI gates the affordance to answered posts but the backend does
        // NOT validate post.isAnswered. Cheapest possible policy — fewest moving parts.
        // alicePostId is NOT answered (is_answered defaults to false).
        mvc.perform(post("/api/v1/posts/{id}/reactions", alicePostId)
                        .header("Authorization", "Bearer " + aliceJwt)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body("praising")))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.data.state").value("added"));
    }

    // ─── Spec 6.6 — INTERCESSION activity boundary ─────────────────────────────
    // Option A: gate INTERCESSION to praying-only. Candle-add and praising-add
    // deliberately do NOT fire INTERCESSION. The pre-6.6 candle behavior fired
    // INTERCESSION on every reaction-add — that drift is corrected here.
    // The existing togglePraying_addPath_firesIntercessionActivity (above) stays
    // green to prove praying behavior is unchanged.

    @Test
    void togglePraising_addPath_doesNotFireIntercessionActivity() throws Exception {
        mvc.perform(post("/api/v1/posts/{id}/reactions", alicePostId)
                        .header("Authorization", "Bearer " + aliceJwt)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body("praising")))
                .andExpect(status().isCreated());

        Integer count = jdbc.queryForObject(
                "SELECT COUNT(*) FROM activity_log WHERE user_id = ? " +
                "AND activity_type = 'intercession' AND source_feature = 'prayer-wall-reaction'",
                Integer.class, alice.getId());
        assertThat(count)
                .as("praising-add is celebration, not intercession — must not fire INTERCESSION (Spec 6.6 Option A)")
                .isEqualTo(0);
    }

    @Test
    void toggleCandle_addPath_doesNotFireIntercessionActivity() throws Exception {
        // BEHAVIOR CHANGE (Spec 6.6 Option A): candle-add no longer fires INTERCESSION.
        // Pre-6.6, ReactionWriteService fired INTERCESSION on every reaction-add — the
        // implementation generalized over praying|candle without semantic justification.
        // Candle is silent remembrance/solidarity, not intercession. Decoupling fixes
        // miscategorization (faith point inflation + 25-intercessions badge eligibility
        // padding). Forward-looking only — historical activity_log INTERCESSION rows
        // from prior candle reactions persist (no retroactive recompute).
        mvc.perform(post("/api/v1/posts/{id}/reactions", alicePostId)
                        .header("Authorization", "Bearer " + aliceJwt)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body("candle")))
                .andExpect(status().isCreated());

        Integer count = jdbc.queryForObject(
                "SELECT COUNT(*) FROM activity_log WHERE user_id = ? " +
                "AND activity_type = 'intercession' AND source_feature = 'prayer-wall-reaction'",
                Integer.class, alice.getId());
        assertThat(count)
                .as("candle-add is silent remembrance, not intercession — must not fire INTERCESSION (Spec 6.6 corrected Spec 3.7 drift)")
                .isEqualTo(0);
    }
}
