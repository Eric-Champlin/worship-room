package com.worshiproom.post;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.worshiproom.auth.JwtService;
import com.worshiproom.safety.ContentType;
import com.worshiproom.safety.CrisisAlertService;
import com.worshiproom.support.AbstractIntegrationTest;
import com.worshiproom.user.User;
import com.worshiproom.user.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.Mockito;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.mock.mockito.SpyBean;
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
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
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

    // Spec 6.6b-deferred-2 Test 9 — spy the real CrisisAlertService bean so the
    // AFTER_COMMIT listener path can be verified end-to-end (matches the
    // CommentWriteIntegrationTest idiom). Delegating spy preserves the real
    // log + Sentry-no-op side effects for the other tests in this class.
    @SpyBean private CrisisAlertService crisisAlertService;

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

        // Clear any spy interactions carried over from a prior test (the
        // listener's 1h dedup cache is bean-scoped, but Mockito's interaction
        // history is per-class-instance and persists across test methods).
        Mockito.reset(crisisAlertService);
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

    // ─── Spec 6.6b-deferred-2: answered_text crisis-scan coverage ────────────
    //
    // Brief Section 5 cases. The three write paths in PostService.updatePost
    // (per spec-time recon R-FINDING-A) are Branches 1, 2, 3 — created/updated/
    // 6.6b-edit per the brief's mapping. Branch 1b (un-mark) is covered by
    // Test 8b. 6.6b regression-safe gate (Gate-G-6.6b-REGRESSION-SAFE) is
    // enforced by leaving T16/T17/T18 unmodified.

    private static final String CRISIS_PHRASE = "I want to end it all";

    private UUID seedUnansweredPostInWindow(UUID authorId) {
        UUID id = UUID.randomUUID();
        OffsetDateTime now = OffsetDateTime.now();
        jdbc.update("""
                INSERT INTO posts (id, user_id, post_type, content, category, visibility, moderation_status,
                                   is_deleted, is_answered, answered_text, answered_at, created_at)
                VALUES (?, ?, 'prayer_request', 'pray for me', 'health', 'public', 'approved',
                        false, false, NULL, NULL, ?)
                """, id, authorId, now);
        return id;
    }

    private boolean crisisFlagOf(UUID postId) {
        return Boolean.TRUE.equals(jdbc.queryForObject(
                "SELECT crisis_flag FROM posts WHERE id = ?", Boolean.class, postId));
    }

    // ─── Test 1: Branch 1 — false→true with crisis answered_text IS flagged ──

    @Test
    void updatePost_branch1_falseToTrueWithCrisisAnsweredText_flagsPost() throws Exception {
        UUID postId = seedUnansweredPostInWindow(alice.getId());

        MvcResult res = mvc.perform(patch("/api/v1/posts/{id}", postId)
                        .header("Authorization", "Bearer " + aliceJwt)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"isAnswered\":true,\"answeredText\":\"" + CRISIS_PHRASE + "\"}"))
                .andExpect(status().isOk())
                .andReturn();

        JsonNode root = mapper.readTree(res.getResponse().getContentAsString());
        assertThat(root.path("data").path("crisisFlag").asBoolean())
                .as("response body crisisFlag MUST be true on Branch 1 with crisis answered_text")
                .isTrue();
        assertThat(crisisFlagOf(postId))
                .as("DB crisis_flag MUST be true on Branch 1 with crisis answered_text")
                .isTrue();
    }

    // ─── Test 2: Branch 2 — true→true with crisis text update IS flagged ────

    @Test
    void updatePost_branch2_stayAnsweredWithCrisisTextUpdate_flagsPost() throws Exception {
        UUID postId = seedAnsweredPost(alice.getId(),
                OffsetDateTime.now(), OffsetDateTime.now(), "praise!");

        MvcResult res = mvc.perform(patch("/api/v1/posts/{id}", postId)
                        .header("Authorization", "Bearer " + aliceJwt)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"isAnswered\":true,\"answeredText\":\"" + CRISIS_PHRASE + " - done\"}"))
                .andExpect(status().isOk())
                .andReturn();

        JsonNode root = mapper.readTree(res.getResponse().getContentAsString());
        assertThat(root.path("data").path("crisisFlag").asBoolean()).isTrue();
        assertThat(crisisFlagOf(postId)).isTrue();
    }

    // ─── Test 3: Branch 3 — 6.6b text-only edit on answered post IS flagged ─

    @Test
    void updatePost_branch3_textOnlyEditOnAnsweredPostWithCrisis_flagsPost() throws Exception {
        UUID postId = seedAnsweredPost(alice.getId(),
                OffsetDateTime.now(), OffsetDateTime.now(), "praise!");

        MvcResult res = mvc.perform(patch("/api/v1/posts/{id}", postId)
                        .header("Authorization", "Bearer " + aliceJwt)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"answeredText\":\"" + CRISIS_PHRASE + "\"}"))
                .andExpect(status().isOk())
                .andReturn();

        JsonNode root = mapper.readTree(res.getResponse().getContentAsString());
        assertThat(root.path("data").path("crisisFlag").asBoolean()).isTrue();
        assertThat(crisisFlagOf(postId)).isTrue();
    }

    // ─── Test 4: Consistency — same crisis string flags across Branches 1/2/3 ─

    @Test
    void updatePost_consistency_sameCrisisStringFlagsAcrossAllThreeBranches() throws Exception {
        // Branch 1.
        UUID b1 = seedUnansweredPostInWindow(alice.getId());
        mvc.perform(patch("/api/v1/posts/{id}", b1)
                        .header("Authorization", "Bearer " + aliceJwt)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"isAnswered\":true,\"answeredText\":\"" + CRISIS_PHRASE + "\"}"))
                .andExpect(status().isOk());

        // Branch 2.
        UUID b2 = seedAnsweredPost(alice.getId(),
                OffsetDateTime.now(), OffsetDateTime.now(), "praise!");
        mvc.perform(patch("/api/v1/posts/{id}", b2)
                        .header("Authorization", "Bearer " + aliceJwt)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"isAnswered\":true,\"answeredText\":\"" + CRISIS_PHRASE + "\"}"))
                .andExpect(status().isOk());

        // Branch 3.
        UUID b3 = seedAnsweredPost(alice.getId(),
                OffsetDateTime.now(), OffsetDateTime.now(), "praise!");
        mvc.perform(patch("/api/v1/posts/{id}", b3)
                        .header("Authorization", "Bearer " + aliceJwt)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"answeredText\":\"" + CRISIS_PHRASE + "\"}"))
                .andExpect(status().isOk());

        assertThat(crisisFlagOf(b1)).as("Branch 1 flagged").isTrue();
        assertThat(crisisFlagOf(b2)).as("Branch 2 flagged").isTrue();
        assertThat(crisisFlagOf(b3)).as("Branch 3 flagged").isTrue();
    }

    // ─── Test 5: Non-regression body — content crisis still flags ────────────

    @Test
    void updatePost_contentCrisisStillFlagsWithoutAnsweredTextChange() throws Exception {
        UUID postId = seedUnansweredPostInWindow(alice.getId());

        mvc.perform(patch("/api/v1/posts/{id}", postId)
                        .header("Authorization", "Bearer " + aliceJwt)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"content\":\"" + CRISIS_PHRASE + "\"}"))
                .andExpect(status().isOk());

        assertThat(crisisFlagOf(postId))
                .as("body crisis detection MUST still work after spec 6.6b-deferred-2")
                .isTrue();
    }

    // ─── Test 6: Non-regression benign — benign answered_text does NOT flag ─

    @Test
    void updatePost_benignAnsweredTextDoesNotFalsePositive() throws Exception {
        UUID postId = seedAnsweredPost(alice.getId(),
                OffsetDateTime.now(), OffsetDateTime.now(), "praise!");

        mvc.perform(patch("/api/v1/posts/{id}", postId)
                        .header("Authorization", "Bearer " + aliceJwt)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"answeredText\":\"God is so good, He has answered my prayer\"}"))
                .andExpect(status().isOk());

        assertThat(crisisFlagOf(postId))
                .as("benign answered_text MUST NOT trigger a false-positive crisis flag")
                .isFalse();
    }

    // ─── Test 8a: Combined fields — content + answered_text crisis in same PATCH ─

    @Test
    void updatePost_combinedContentAndAnsweredTextCrisis_flagsPostWithSingleEvent() throws Exception {
        UUID postId = seedUnansweredPostInWindow(alice.getId());

        mvc.perform(patch("/api/v1/posts/{id}", postId)
                        .header("Authorization", "Bearer " + aliceJwt)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"content\":\"" + CRISIS_PHRASE + "\","
                                + "\"isAnswered\":true,"
                                + "\"answeredText\":\"I really mean it, " + CRISIS_PHRASE + "\"}"))
                .andExpect(status().isOk());

        assertThat(crisisFlagOf(postId))
                .as("combined content + answered_text crisis MUST flag the post")
                .isTrue();
        // Single AFTER_COMMIT event per commit (concat into one detection call,
        // not two). The listener's dedup cache would catch duplicates, but the
        // spec's atomicity intent is one event per commit.
        verify(crisisAlertService, times(1))
                .alert(eq(postId), eq(alice.getId()), eq(ContentType.POST));
    }

    // ─── Test 8b: One-way ratchet — un-mark does NOT clear an existing crisis_flag ─

    @Test
    void updatePost_unmarkPreviouslyFlaggedPost_doesNotClearFlag() throws Exception {
        UUID postId = seedAnsweredPost(alice.getId(),
                OffsetDateTime.now(), OffsetDateTime.now(), "praise!");
        // Manually mark as crisis-flagged to simulate a post that was previously
        // detected. seedAnsweredPost defaults crisis_flag=false.
        jdbc.update("UPDATE posts SET crisis_flag = TRUE WHERE id = ?", postId);

        mvc.perform(patch("/api/v1/posts/{id}", postId)
                        .header("Authorization", "Bearer " + aliceJwt)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"isAnswered\":false}"))
                .andExpect(status().isOk());

        // One-way ratchet: author un-marking a flagged post must NOT clear the flag.
        assertThat(crisisFlagOf(postId))
                .as("crisis_flag MUST stay TRUE after author un-mark (one-way ratchet)")
                .isTrue();
        // is_answered + answered_text were cleared per Branch 1b.
        Boolean isAnswered = jdbc.queryForObject(
                "SELECT is_answered FROM posts WHERE id = ?", Boolean.class, postId);
        String answeredText = jdbc.queryForObject(
                "SELECT answered_text FROM posts WHERE id = ?", String.class, postId);
        assertThat(isAnswered).isFalse();
        assertThat(answeredText).isNull();
    }

    // ─── Test 9: AFTER_COMMIT event-payload verification ─────────────────────

    @Test
    void updatePost_answeredTextCrisis_publishesEventWithCorrectPayload() throws Exception {
        UUID postId = seedAnsweredPost(alice.getId(),
                OffsetDateTime.now(), OffsetDateTime.now(), "praise!");

        mvc.perform(patch("/api/v1/posts/{id}", postId)
                        .header("Authorization", "Bearer " + aliceJwt)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"answeredText\":\"" + CRISIS_PHRASE + "\"}"))
                .andExpect(status().isOk());

        // The CrisisDetectedEvent → CrisisDetectedEventListener → CrisisAlertService.alert
        // chain MUST fire exactly once with (postId, alice.id, ContentType.POST).
        verify(crisisAlertService, times(1))
                .alert(eq(postId), eq(alice.getId()), eq(ContentType.POST));
    }
}
