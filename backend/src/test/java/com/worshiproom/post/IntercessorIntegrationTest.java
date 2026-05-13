package com.worshiproom.post;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.worshiproom.auth.JwtService;
import com.worshiproom.friends.FriendRelationship;
import com.worshiproom.friends.FriendRelationshipRepository;
import com.worshiproom.friends.FriendRelationshipStatus;
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

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Spec 6.5 — end-to-end coverage of the Intercessor Timeline endpoint
 * ({@code GET /api/v1/posts/{postId}/intercessors}) plus the feed-endpoint
 * {@code intercessorSummary} enhancement.
 *
 * <p>LOAD-BEARING for Gate-G-ANONYMOUS-PRIVACY: every test that produces
 * mixed named/anonymous entries asserts at the raw-JSON level that anonymous
 * entries have NO {@code userId} key.
 *
 * <p>Privacy model: friend-vs-non-friend classification using the VIEWER's
 * friend set (Plan-Time Divergence §1). 6.1 uses the author's friend set;
 * 6.5 uses the viewer's. Tests seed friendships in the viewer→reactor
 * direction to model this.
 */
@AutoConfigureMockMvc
class IntercessorIntegrationTest extends AbstractIntegrationTest {

    private static final String TEST_JWT_SECRET =
            "test-jwt-secret-at-least-32-bytes-long-xxxxxxxxxxxxxx";

    @DynamicPropertySource
    static void properties(DynamicPropertyRegistry registry) {
        registry.add("jwt.secret", () -> TEST_JWT_SECRET);
        registry.add("auth.rate-limit.per-email.capacity", () -> "1000");
        registry.add("auth.rate-limit.per-ip.capacity", () -> "10000");
        // Default 60/min — rate-limit test exercises the 61st-call boundary.
    }

    @Autowired private MockMvc mvc;
    @Autowired private ObjectMapper mapper;
    @Autowired private UserRepository userRepository;
    @Autowired private FriendRelationshipRepository friendRepo;
    @Autowired private JwtService jwtService;
    @Autowired private JdbcTemplate jdbc;

    private User author;
    private User viewer;
    private String viewerJwt;
    private String authorJwt;

    @BeforeEach
    void seed() {
        jdbc.update("DELETE FROM activity_log");
        jdbc.update("DELETE FROM friend_relationships");
        jdbc.update("DELETE FROM post_reactions");
        jdbc.update("DELETE FROM post_bookmarks");
        jdbc.update("DELETE FROM post_comments");
        jdbc.update("DELETE FROM posts");
        jdbc.update("DELETE FROM users");

        author = userRepository.saveAndFlush(
                new User("author-i@test.local", "$2a$10$x", "Avery", "Author", "UTC"));
        viewer = userRepository.saveAndFlush(
                new User("viewer-i@test.local", "$2a$10$x", "Vera", "Viewer", "UTC"));
        authorJwt = jwtService.generateToken(author.getId(), false);
        viewerJwt = jwtService.generateToken(viewer.getId(), false);
    }

    // ─── seed helpers ──────────────────────────────────────────────────────

    private UUID seedPost(UUID userId, String visibility, boolean deleted) {
        UUID id = UUID.randomUUID();
        jdbc.update("""
                INSERT INTO posts (id, user_id, post_type, content, visibility, moderation_status,
                                   is_anonymous, is_deleted, deleted_at, praying_count)
                VALUES (?, ?, 'prayer_request', 'intercessor test', ?, 'approved',
                        false, ?, ?, 0)
                """, id, userId, visibility, deleted,
                deleted ? OffsetDateTime.now() : null);
        return id;
    }

    private User seedUser(String email, String first, String last) {
        return userRepository.saveAndFlush(new User(email, "$2a$10$x", first, last, "UTC"));
    }

    private void seedViewerFriendship(UUID friendUserId) {
        // Direction: viewer.userId → friendUserId (viewer's friend set).
        friendRepo.saveAndFlush(new FriendRelationship(
                viewer.getId(), friendUserId, FriendRelationshipStatus.ACTIVE));
    }

    private void seedAuthorFriendshipToViewer() {
        // For friends-only visibility: PostSpecifications.visibleTo() uses
        // fr.userId = post.userId AND fr.friendUserId = viewer. Author must
        // list viewer as a friend.
        friendRepo.saveAndFlush(new FriendRelationship(
                author.getId(), viewer.getId(), FriendRelationshipStatus.ACTIVE));
    }

    private void seedPrayingReaction(UUID postId, UUID userId) {
        jdbc.update("""
                INSERT INTO post_reactions (post_id, user_id, reaction_type)
                VALUES (?, ?, 'praying')
                """, postId, userId);
    }

    private void seedPrayingReactionAt(UUID postId, UUID userId, OffsetDateTime at) {
        // created_at column is declared insertable=false on the JPA entity but
        // can be explicitly written via JDBC.
        String ts = at.toString();
        jdbc.update("""
                INSERT INTO post_reactions (post_id, user_id, reaction_type, created_at)
                VALUES (?, ?, 'praying', CAST(? AS TIMESTAMP WITH TIME ZONE))
                """, postId, userId, ts);
    }

    private void setPrayingCount(UUID postId, int n) {
        jdbc.update("UPDATE posts SET praying_count = ? WHERE id = ?", n, postId);
    }

    // ─── 1. Public post with one named friend reaction — 200 + entries ─────

    @Test
    void getIntercessors_authenticatedUser_publicPost_returns200WithEntries() throws Exception {
        UUID postId = seedPost(author.getId(), "public", false);
        User friend = seedUser("f1@test", "Fred", "Friend");
        seedViewerFriendship(friend.getId());
        seedPrayingReaction(postId, friend.getId());
        setPrayingCount(postId, 1);

        mvc.perform(get("/api/v1/posts/{id}/intercessors", postId)
                        .header("Authorization", "Bearer " + viewerJwt))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.totalCount").value(1))
                .andExpect(jsonPath("$.data.entries.length()").value(1))
                .andExpect(jsonPath("$.data.entries[0].isAnonymous").value(false))
                .andExpect(jsonPath("$.data.entries[0].displayName").value("Fred"));
    }

    // ─── 2. Zero reactions — 200 with empty array ──────────────────────────

    @Test
    void getIntercessors_publicPost_zeroReactions_returns200WithEmptyArray() throws Exception {
        UUID postId = seedPost(author.getId(), "public", false);

        mvc.perform(get("/api/v1/posts/{id}/intercessors", postId)
                        .header("Authorization", "Bearer " + viewerJwt))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.totalCount").value(0))
                .andExpect(jsonPath("$.data.entries.length()").value(0));
    }

    // ─── 3. 75 reactions, cap at 50, totalCount=75 ─────────────────────────

    @Test
    void getIntercessors_publicPost_75Reactions_returns50Recent_totalCount75() throws Exception {
        UUID postId = seedPost(author.getId(), "public", false);
        OffsetDateTime base = OffsetDateTime.now().minusHours(2);
        for (int i = 0; i < 75; i++) {
            User u = seedUser("u" + i + "@test", "U" + i, "L");
            seedPrayingReactionAt(postId, u.getId(), base.plusMinutes(i));
        }
        setPrayingCount(postId, 75);

        mvc.perform(get("/api/v1/posts/{id}/intercessors", postId)
                        .header("Authorization", "Bearer " + viewerJwt))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.totalCount").value(75))
                .andExpect(jsonPath("$.data.entries.length()").value(50));
    }

    // ─── 4. Mixed named + anonymous: userId ABSENT for anonymous (Gate-G) ──

    @Test
    void getIntercessors_mixedNamedAndAnonymous_jsonResponseOmitsUserIdForAnonymous() throws Exception {
        UUID postId = seedPost(author.getId(), "public", false);
        User friend = seedUser("f@test", "Fred", "Friend");
        User stranger = seedUser("s@test", "Stranger", "Sole");
        seedViewerFriendship(friend.getId());
        seedPrayingReaction(postId, friend.getId());
        seedPrayingReaction(postId, stranger.getId());
        setPrayingCount(postId, 2);

        MvcResult result = mvc.perform(get("/api/v1/posts/{id}/intercessors", postId)
                        .header("Authorization", "Bearer " + viewerJwt))
                .andExpect(status().isOk())
                .andReturn();

        JsonNode body = mapper.readTree(result.getResponse().getContentAsString());
        JsonNode entries = body.path("data").path("entries");
        assertThat(entries.size()).isEqualTo(2);

        boolean foundAnonymous = false;
        boolean foundNamed = false;
        for (JsonNode entry : entries) {
            if (entry.get("isAnonymous").asBoolean()) {
                // Gate-G-ANONYMOUS-PRIVACY (HARD): the key MUST be absent.
                assertThat(entry.has("userId")).isFalse();
                assertThat(entry.get("displayName").asText()).isEqualTo("Anonymous");
                foundAnonymous = true;
            } else {
                assertThat(entry.has("userId")).isTrue();
                assertThat(entry.get("userId").asText()).isEqualTo(friend.getId().toString());
                foundNamed = true;
            }
        }
        assertThat(foundAnonymous).isTrue();
        assertThat(foundNamed).isTrue();

        // Defense-in-depth: stranger's UUID MUST NOT appear anywhere in the body.
        String raw = result.getResponse().getContentAsString();
        assertThat(raw).doesNotContain(stranger.getId().toString());
    }

    // ─── 5. Friends-only post, non-friend viewer — 404 ─────────────────────

    @Test
    void getIntercessors_friendsOnlyPost_viewerIsNonFriend_returns404() throws Exception {
        UUID postId = seedPost(author.getId(), "friends", false);
        // Author has NOT friended viewer → visibility predicate fails for friends-only.

        mvc.perform(get("/api/v1/posts/{id}/intercessors", postId)
                        .header("Authorization", "Bearer " + viewerJwt))
                .andExpect(status().isNotFound());
    }

    // ─── 6. Friends-only post, viewer IS author's friend — 200 ────────────

    @Test
    void getIntercessors_friendsOnlyPost_viewerIsFriend_returns200() throws Exception {
        UUID postId = seedPost(author.getId(), "friends", false);
        seedAuthorFriendshipToViewer();

        mvc.perform(get("/api/v1/posts/{id}/intercessors", postId)
                        .header("Authorization", "Bearer " + viewerJwt))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.totalCount").value(0));
    }

    // ─── 7. Private post, viewer is not author — 404 ──────────────────────

    @Test
    void getIntercessors_privatePost_viewerIsNotAuthor_returns404() throws Exception {
        UUID postId = seedPost(author.getId(), "private", false);

        mvc.perform(get("/api/v1/posts/{id}/intercessors", postId)
                        .header("Authorization", "Bearer " + viewerJwt))
                .andExpect(status().isNotFound());
    }

    // ─── 8. Private post, viewer IS author — 200 ──────────────────────────

    @Test
    void getIntercessors_privatePost_viewerIsAuthor_returns200() throws Exception {
        UUID postId = seedPost(author.getId(), "private", false);

        mvc.perform(get("/api/v1/posts/{id}/intercessors", postId)
                        .header("Authorization", "Bearer " + authorJwt))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.totalCount").value(0));
    }

    // ─── 9. Nonexistent postId — 404 ──────────────────────────────────────

    @Test
    void getIntercessors_nonexistentPostId_returns404() throws Exception {
        mvc.perform(get("/api/v1/posts/{id}/intercessors", UUID.randomUUID())
                        .header("Authorization", "Bearer " + viewerJwt))
                .andExpect(status().isNotFound());
    }

    // ─── 10. Unauthenticated — 401 ────────────────────────────────────────

    @Test
    void getIntercessors_unauthenticated_returns401() throws Exception {
        UUID postId = seedPost(author.getId(), "public", false);

        mvc.perform(get("/api/v1/posts/{id}/intercessors", postId))
                .andExpect(status().isUnauthorized());
    }

    // ─── 11. Rate limit: 60 OK, 61st returns 429 with Retry-After ─────────

    @Test
    void getIntercessors_rateLimit_61stRequestReturns429WithRetryAfter() throws Exception {
        UUID postId = seedPost(author.getId(), "public", false);
        for (int i = 0; i < 60; i++) {
            mvc.perform(get("/api/v1/posts/{id}/intercessors", postId)
                            .header("Authorization", "Bearer " + viewerJwt))
                    .andExpect(status().isOk());
        }
        mvc.perform(get("/api/v1/posts/{id}/intercessors", postId)
                        .header("Authorization", "Bearer " + viewerJwt))
                .andExpect(status().isTooManyRequests())
                .andExpect(header().exists("Retry-After"))
                .andExpect(jsonPath("$.code").value("INTERCESSOR_READ_RATE_LIMITED"));
    }

    // ─── 12. Soft-deleted post — 404 ──────────────────────────────────────

    @Test
    void getIntercessors_softDeletedPost_returns404() throws Exception {
        UUID postId = seedPost(author.getId(), "public", true);

        mvc.perform(get("/api/v1/posts/{id}/intercessors", postId)
                        .header("Authorization", "Bearer " + viewerJwt))
                .andExpect(status().isNotFound());
    }

    // ─── 13. Cache-Control: private, no-store on 200 ──────────────────────

    @Test
    void getIntercessors_responseHasCacheControlPrivateNoStore() throws Exception {
        UUID postId = seedPost(author.getId(), "public", false);

        mvc.perform(get("/api/v1/posts/{id}/intercessors", postId)
                        .header("Authorization", "Bearer " + viewerJwt)
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(header().string("Cache-Control", "private, no-store"));
    }

    // ─── 14. Self always sees own reaction by name ────────────────────────

    @Test
    void getIntercessors_selfIsAlwaysNamed_endToEnd() throws Exception {
        UUID postId = seedPost(author.getId(), "public", false);
        seedPrayingReaction(postId, viewer.getId());
        setPrayingCount(postId, 1);

        mvc.perform(get("/api/v1/posts/{id}/intercessors", postId)
                        .header("Authorization", "Bearer " + viewerJwt))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.entries[0].isAnonymous").value(false))
                .andExpect(jsonPath("$.data.entries[0].userId").value(viewer.getId().toString()))
                .andExpect(jsonPath("$.data.entries[0].displayName").value("Vera"));
    }

    // ─── Feed-endpoint intercessorSummary enhancement ─────────────────────

    @Test
    void listFeed_returnsIntercessorSummaryOnEachPost() throws Exception {
        UUID postId = seedPost(author.getId(), "public", false);
        User friend = seedUser("ff@test", "Friend", "Two");
        seedViewerFriendship(friend.getId());
        seedPrayingReaction(postId, friend.getId());
        setPrayingCount(postId, 1);

        mvc.perform(get("/api/v1/posts")
                        .header("Authorization", "Bearer " + viewerJwt))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data[0].intercessorSummary").exists())
                .andExpect(jsonPath("$.data[0].intercessorSummary.count").value(1))
                .andExpect(jsonPath("$.data[0].intercessorSummary.firstThree.length()").value(1))
                .andExpect(jsonPath("$.data[0].intercessorSummary.firstThree[0].isAnonymous").value(false));
    }

    @Test
    void listFeed_zeroReactions_intercessorSummaryHasCountZeroAndEmptyFirstThree() throws Exception {
        seedPost(author.getId(), "public", false);

        mvc.perform(get("/api/v1/posts")
                        .header("Authorization", "Bearer " + viewerJwt))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data[0].intercessorSummary.count").value(0))
                .andExpect(jsonPath("$.data[0].intercessorSummary.firstThree.length()").value(0));
    }

    @Test
    void listFeed_anonymousEntriesInFirstThreeOmitUserId() throws Exception {
        UUID postId = seedPost(author.getId(), "public", false);
        User stranger = seedUser("stranger@test", "Mystery", "Visitor");
        seedPrayingReaction(postId, stranger.getId());
        setPrayingCount(postId, 1);

        MvcResult result = mvc.perform(get("/api/v1/posts")
                        .header("Authorization", "Bearer " + viewerJwt))
                .andExpect(status().isOk())
                .andReturn();
        JsonNode body = mapper.readTree(result.getResponse().getContentAsString());
        JsonNode firstThree = body.path("data").get(0).path("intercessorSummary").path("firstThree");
        assertThat(firstThree.size()).isEqualTo(1);
        JsonNode entry = firstThree.get(0);
        assertThat(entry.get("isAnonymous").asBoolean()).isTrue();
        assertThat(entry.has("userId")).isFalse();

        String raw = result.getResponse().getContentAsString();
        assertThat(raw).doesNotContain(stranger.getId().toString());
    }

    @Test
    void listFeed_responseHasCacheControlPrivateNoStore() throws Exception {
        seedPost(author.getId(), "public", false);

        mvc.perform(get("/api/v1/posts")
                        .header("Authorization", "Bearer " + viewerJwt))
                .andExpect(status().isOk())
                .andExpect(header().string("Cache-Control", "private, no-store"));
    }
}
