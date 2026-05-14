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

import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Spec 6.6b — 'celebrate' reaction write paths.
 *
 * <p>Covers test cases T1, T2, T3, T5, T6 from spec-6-6b.md § 9. T7
 * (regressionSafe) is satisfied by running the existing
 * {@link ReactionWriteIntegrationTest} with zero assertion modifications;
 * those tests stay green and prove praying/candle/praising behavior is
 * unchanged.
 *
 * <p>Mirrors the {@link ReactionWriteIntegrationTest} setup pattern verbatim
 * (JWT seed, JDBC fixture, rate-limit override).
 */
@AutoConfigureMockMvc
class CelebrateReactionWriteTest extends AbstractIntegrationTest {

    private static final String TEST_JWT_SECRET =
            "test-jwt-secret-at-least-32-bytes-long-xxxxxxxxxxxxxx";

    @DynamicPropertySource
    static void properties(DynamicPropertyRegistry registry) {
        registry.add("jwt.secret", () -> TEST_JWT_SECRET);
        registry.add("auth.rate-limit.per-email.capacity", () -> "1000");
        registry.add("auth.rate-limit.per-ip.capacity", () -> "10000");
        // Reaction limit comfortably above the per-test budget (max test is
        // ADD+REMOVE+ADD = 3 token-consuming calls). 6.6b doesn't re-test the
        // 429 path; ReactionWriteIntegrationTest already covers it.
        registry.add("worshiproom.reactions.rate-limit.max-per-hour", () -> "10");
    }

    @Autowired private MockMvc mvc;
    @Autowired private ObjectMapper mapper;
    @Autowired private UserRepository userRepository;
    @Autowired private JwtService jwtService;
    @Autowired private JdbcTemplate jdbc;

    private User alice;
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

        alice = userRepository.saveAndFlush(new User("alice-celebrate@test.local", "$2a$10$x",
                "Alice", "Anderson", "UTC"));
        aliceJwt = jwtService.generateToken(alice.getId(), false);
        alicePostId = seedAnsweredPost(alice.getId());
    }

    private UUID seedAnsweredPost(UUID userId) {
        UUID id = UUID.randomUUID();
        jdbc.update("""
                INSERT INTO posts (id, user_id, post_type, content, visibility, moderation_status,
                                   is_deleted, is_answered, answered_text, answered_at)
                VALUES (?, ?, 'prayer_request', 'please pray', 'public', 'approved',
                        false, true, 'thank you Lord!', NOW())
                """, id, userId);
        return id;
    }

    private String body(String reactionType) throws Exception {
        return mapper.writeValueAsString(new ToggleReactionRequest(reactionType));
    }

    // ─── T1/T2: 'celebrate' accepted by CHECK constraint via integration write ───

    @Test
    void toggleCelebrate_addPath_returns201WithAllFourCounts() throws Exception {
        // T1/T2 — POST /posts/{id}/reactions with reactionType='celebrate' succeeds.
        // Proves: @Pattern accepts 'celebrate'; DB CHECK accepts 'celebrate'
        // (changeset 2026-05-14-003); celebrate_count column exists and
        // increments (changeset 2026-05-14-004); ToggleReactionResponse
        // includes celebrateCount.
        mvc.perform(post("/api/v1/posts/{id}/reactions", alicePostId)
                        .header("Authorization", "Bearer " + aliceJwt)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body("celebrate")))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.data.reactionType").value("celebrate"))
                .andExpect(jsonPath("$.data.state").value("added"))
                .andExpect(jsonPath("$.data.prayingCount").value(0))
                .andExpect(jsonPath("$.data.candleCount").value(0))
                .andExpect(jsonPath("$.data.praisingCount").value(0))
                .andExpect(jsonPath("$.data.celebrateCount").value(1));

        Integer rows = jdbc.queryForObject(
                "SELECT COUNT(*) FROM post_reactions WHERE post_id = ? AND user_id = ? AND reaction_type = 'celebrate'",
                Integer.class, alicePostId, alice.getId());
        assertThat(rows).isEqualTo(1);

        Integer celebrateCount = jdbc.queryForObject(
                "SELECT celebrate_count FROM posts WHERE id = ?", Integer.class, alicePostId);
        assertThat(celebrateCount).isEqualTo(1);
    }

    // ─── T6: REMOVE path decrements counter and returns state=removed ───

    @Test
    void toggleCelebrate_removePath_returns200WithStateRemovedAndDecrementsCounter() throws Exception {
        mvc.perform(post("/api/v1/posts/{id}/reactions", alicePostId)
                        .header("Authorization", "Bearer " + aliceJwt)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body("celebrate")))
                .andExpect(status().isCreated());
        mvc.perform(post("/api/v1/posts/{id}/reactions", alicePostId)
                        .header("Authorization", "Bearer " + aliceJwt)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body("celebrate")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.state").value("removed"))
                .andExpect(jsonPath("$.data.celebrateCount").value(0));

        Integer rows = jdbc.queryForObject(
                "SELECT COUNT(*) FROM post_reactions WHERE post_id = ? AND user_id = ? AND reaction_type = 'celebrate'",
                Integer.class, alicePostId, alice.getId());
        assertThat(rows).isEqualTo(0);

        Integer celebrateCount = jdbc.queryForObject(
                "SELECT celebrate_count FROM posts WHERE id = ?", Integer.class, alicePostId);
        assertThat(celebrateCount).isEqualTo(0);
    }

    // ─── T6 (continued): explicit DELETE is idempotent ───

    @Test
    void deleteReactionCelebrate_explicit_isIdempotent() throws Exception {
        // DELETE on non-existent row → 204 (idempotent).
        mvc.perform(delete("/api/v1/posts/{id}/reactions", alicePostId)
                        .header("Authorization", "Bearer " + aliceJwt)
                        .param("reactionType", "celebrate"))
                .andExpect(status().isNoContent());

        // ADD then DELETE → 204, counter back to 0.
        mvc.perform(post("/api/v1/posts/{id}/reactions", alicePostId)
                        .header("Authorization", "Bearer " + aliceJwt)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body("celebrate")))
                .andExpect(status().isCreated());
        mvc.perform(delete("/api/v1/posts/{id}/reactions", alicePostId)
                        .header("Authorization", "Bearer " + aliceJwt)
                        .param("reactionType", "celebrate"))
                .andExpect(status().isNoContent());

        Integer celebrateCount = jdbc.queryForObject(
                "SELECT celebrate_count FROM posts WHERE id = ?", Integer.class, alicePostId);
        assertThat(celebrateCount).isEqualTo(0);
    }

    // ─── T5: ADD does NOT fire INTERCESSION activity ───
    // Gate-G-CELEBRATE-NO-INTERCESSION HARD: celebrate is a warm sunrise
    // affirmation on an answered prayer, not an act of intercession. Sibling
    // assertions exist for praising (Spec 6.6) and candle.

    @Test
    void toggleCelebrate_addPath_doesNotFireIntercessionActivity() throws Exception {
        mvc.perform(post("/api/v1/posts/{id}/reactions", alicePostId)
                        .header("Authorization", "Bearer " + aliceJwt)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body("celebrate")))
                .andExpect(status().isCreated());

        Integer count = jdbc.queryForObject(
                "SELECT COUNT(*) FROM activity_log WHERE user_id = ? " +
                "AND activity_type = 'intercession' AND source_feature = 'prayer-wall-reaction'",
                Integer.class, alice.getId());
        assertThat(count)
                .as("celebrate-add is celebration of answered prayer, not intercession — must NOT fire INTERCESSION (Gate-G-CELEBRATE-NO-INTERCESSION)")
                .isEqualTo(0);
    }

    // ─── T3: DB-level rejection of invalid value (post-003 CHECK) ───
    // The smoke test (LiquibaseSmokeTest.phase3CheckConstraintRejectsInvalidValue)
    // already proves the CHECK rejects 'invalid_reaction_type'. Here we prove
    // the @Pattern validator gives 400 INVALID_INPUT (not a DB-level 500) for
    // a value the regex doesn't accept — defense in depth.

    @Test
    void toggleReaction_invalidReactionType_returns400_notDb500() throws Exception {
        mvc.perform(post("/api/v1/posts/{id}/reactions", alicePostId)
                        .header("Authorization", "Bearer " + aliceJwt)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(mapper.writeValueAsString(new ToggleReactionRequest("amen"))))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("INVALID_INPUT"));
    }
}
