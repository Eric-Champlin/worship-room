package com.worshiproom.post;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.worshiproom.auth.JwtService;
import com.worshiproom.friends.FriendRelationship;
import com.worshiproom.friends.FriendRelationshipRepository;
import com.worshiproom.friends.FriendRelationshipStatus;
import com.worshiproom.post.engagement.dto.ToggleReactionRequest;
import com.worshiproom.support.AbstractIntegrationTest;
import com.worshiproom.user.User;
import com.worshiproom.user.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.cache.Cache;
import org.springframework.cache.CacheManager;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;

import java.time.OffsetDateTime;
import java.util.Objects;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Spec 6.6b — Answered Wall feed cache behavior.
 *
 * <p>Covers T23 (cache hit) + T24 (cache eviction on isAnswered transition and
 * content edit) + the <b>cache-boundary test</b> mandated by Eric's ED-5
 * Option (b) sign-off: two viewers with different friend sets must see the
 * same cached underlying posts but different per-viewer
 * {@code intercessorSummary} — the leak test that proves the cache key sits
 * BELOW per-viewer enrichment.
 *
 * <p>The cache used in tests is in-memory ({@code ConcurrentMapCacheManager}
 * per {@link com.worshiproom.cache.CacheConfig}); test-time {@link CacheManager}
 * injection lets us inspect cache state directly and clear between tests.
 */
@AutoConfigureMockMvc
class AnsweredFeedCacheTest extends AbstractIntegrationTest {

    private static final String TEST_JWT_SECRET =
            "test-jwt-secret-at-least-32-bytes-long-xxxxxxxxxxxxxx";

    @DynamicPropertySource
    static void properties(DynamicPropertyRegistry registry) {
        registry.add("jwt.secret", () -> TEST_JWT_SECRET);
        registry.add("auth.rate-limit.per-email.capacity", () -> "1000");
        registry.add("auth.rate-limit.per-ip.capacity", () -> "10000");
        registry.add("worshiproom.reactions.rate-limit.max-per-hour", () -> "10");
    }

    @Autowired private MockMvc mvc;
    @Autowired private ObjectMapper mapper;
    @Autowired private UserRepository userRepository;
    @Autowired private FriendRelationshipRepository friendRepository;
    @Autowired private JwtService jwtService;
    @Autowired private JdbcTemplate jdbc;
    @Autowired private CacheManager cacheManager;

    private User alice;   // viewer 1
    private User bob;     // viewer 2 — NOT alice's friend
    private User reactor; // praying reactor — alice's friend, NOT bob's friend
    private User author;  // post author
    private String aliceJwt;
    private String bobJwt;
    private String reactorJwt;
    private String authorJwt;

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

        alice = userRepository.saveAndFlush(new User("alice-cache@test.local", "$2a$10$x",
                "Alice", "Anderson", "UTC"));
        bob = userRepository.saveAndFlush(new User("bob-cache@test.local", "$2a$10$x",
                "Bob", "Bennett", "UTC"));
        reactor = userRepository.saveAndFlush(new User("reactor-cache@test.local", "$2a$10$x",
                "Reactor", "R", "UTC"));
        author = userRepository.saveAndFlush(new User("author-cache@test.local", "$2a$10$x",
                "Author", "A", "UTC"));

        // Alice ↔ Reactor are friends (both directions per Phase 2.5 mutual model).
        friendRepository.saveAndFlush(new FriendRelationship(
                alice.getId(), reactor.getId(), FriendRelationshipStatus.ACTIVE));
        friendRepository.saveAndFlush(new FriendRelationship(
                reactor.getId(), alice.getId(), FriendRelationshipStatus.ACTIVE));
        // Bob has no friendship with Reactor.

        aliceJwt = jwtService.generateToken(alice.getId(), false);
        bobJwt = jwtService.generateToken(bob.getId(), false);
        reactorJwt = jwtService.generateToken(reactor.getId(), false);
        authorJwt = jwtService.generateToken(author.getId(), false);
    }

    private UUID seedAnsweredPost(UUID authorId, String category, OffsetDateTime answeredAt) {
        UUID id = UUID.randomUUID();
        jdbc.update("""
                INSERT INTO posts (id, user_id, post_type, content, category, visibility, moderation_status,
                                   is_deleted, is_answered, answered_text, answered_at)
                VALUES (?, ?, 'prayer_request', 'pray for me', ?, 'public', 'approved',
                        false, true, 'thank you Lord!', ?)
                """, id, authorId, category, answeredAt);
        return id;
    }

    private String body(String reactionType) throws Exception {
        return mapper.writeValueAsString(new ToggleReactionRequest(reactionType));
    }

    // The cache key as computed by AnsweredFeedCache.loadAnsweredFeedPublic —
    // Objects.hash(category, postType, qotdId, page, limit). Useful for direct
    // cache inspection.
    private static int cacheKey(String category, String postType, String qotdId, int page, int limit) {
        return Objects.hash(category, postType, qotdId, page, limit);
    }

    // ─── T23: second identical request hits the cache ─────────────────────────

    @Test
    void getAnswered_secondIdenticalRequest_hitsCache() throws Exception {
        seedAnsweredPost(author.getId(), "health", OffsetDateTime.now());

        Cache cache = cacheManager.getCache("answered-feed");
        assertThat(cache).isNotNull();
        assertThat(cache.get(cacheKey("health", null, null, 1, 20)))
                .as("cache empty before first request")
                .isNull();

        mvc.perform(get("/api/v1/posts")
                        .param("sort", "answered")
                        .param("category", "health")
                        .param("page", "1")
                        .param("limit", "20"))
                .andExpect(status().isOk());

        assertThat(cache.get(cacheKey("health", null, null, 1, 20)))
                .as("cache populated after first request")
                .isNotNull();

        // Second identical request — must hit cache. Functional assertion is
        // that the response succeeds; cache-state assertion above is the
        // structural one.
        mvc.perform(get("/api/v1/posts")
                        .param("sort", "answered")
                        .param("category", "health")
                        .param("page", "1")
                        .param("limit", "20"))
                .andExpect(status().isOk());
    }

    // ─── T23: different category cached separately ────────────────────────────

    @Test
    void getAnswered_differentCategories_cachedSeparately() throws Exception {
        seedAnsweredPost(author.getId(), "health", OffsetDateTime.now());
        seedAnsweredPost(author.getId(), "family", OffsetDateTime.now().minusMinutes(1));

        Cache cache = cacheManager.getCache("answered-feed");
        assertThat(cache).isNotNull();

        mvc.perform(get("/api/v1/posts").param("sort", "answered").param("category", "health"))
                .andExpect(status().isOk());
        mvc.perform(get("/api/v1/posts").param("sort", "answered").param("category", "family"))
                .andExpect(status().isOk());

        assertThat(cache.get(cacheKey("health", null, null, 1, 20))).isNotNull();
        assertThat(cache.get(cacheKey("family", null, null, 1, 20))).isNotNull();
    }

    // ─── T24: PATCH that toggles isAnswered evicts the cache ─────────────────

    @Test
    void updatePost_isAnsweredTransition_evictsAnsweredFeedCache() throws Exception {
        UUID postId = seedAnsweredPost(author.getId(), "health", OffsetDateTime.now());

        // Populate cache.
        mvc.perform(get("/api/v1/posts").param("sort", "answered").param("category", "health"))
                .andExpect(status().isOk());
        Cache cache = cacheManager.getCache("answered-feed");
        assertThat(cache).isNotNull();
        assertThat(cache.get(cacheKey("health", null, null, 1, 20))).isNotNull();

        // Un-mark — author PATCHes their own post.
        mvc.perform(patch("/api/v1/posts/{id}", postId)
                        .header("Authorization", "Bearer " + authorJwt)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"isAnswered\":false}"))
                .andExpect(status().isOk());

        assertThat(cache.get(cacheKey("health", null, null, 1, 20)))
                .as("cache must be evicted after isAnswered transition")
                .isNull();
    }

    // ─── T24: PATCH that edits answeredText on an answered post evicts cache ─

    @Test
    void updatePost_answeredTextEdit_evictsAnsweredFeedCache() throws Exception {
        UUID postId = seedAnsweredPost(author.getId(), "health", OffsetDateTime.now());

        mvc.perform(get("/api/v1/posts").param("sort", "answered").param("category", "health"))
                .andExpect(status().isOk());
        Cache cache = cacheManager.getCache("answered-feed");
        assertThat(cache).isNotNull();
        assertThat(cache.get(cacheKey("health", null, null, 1, 20))).isNotNull();

        // Edit the answered_text on an already-answered post.
        mvc.perform(patch("/api/v1/posts/{id}", postId)
                        .header("Authorization", "Bearer " + authorJwt)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"answeredText\":\"Updated testimony\"}"))
                .andExpect(status().isOk());

        assertThat(cache.get(cacheKey("health", null, null, 1, 20)))
                .as("cache must be evicted after answered_text edit (any updatePost evicts)")
                .isNull();
    }

    // ─── Cache-boundary test (ED-5 Option (b) hard requirement) ──────────────
    //
    // Two viewers (Alice, Bob) request the same answered feed page. Both must
    // see the same underlying posts (cached, viewer-agnostic). But their
    // intercessorSummary must differ — Alice sees Reactor as a friend by name;
    // Bob sees Reactor as Anonymous.
    //
    // If intercessorSummary were baked into the cached value, Bob would see
    // Alice's friend classification — that's the leak this test catches.

    @Test
    void cacheBoundary_viewerAgnosticPostsButPerViewerIntercessorSummary() throws Exception {
        UUID postId = seedAnsweredPost(author.getId(), "health", OffsetDateTime.now());

        // Reactor 'prays' for the post. This is what intercessorSummary classifies.
        mvc.perform(post("/api/v1/posts/{id}/reactions", postId)
                        .header("Authorization", "Bearer " + reactorJwt)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body("praying")))
                .andExpect(status().isCreated());

        // Alice views the feed.
        MvcResult aliceResult = mvc.perform(get("/api/v1/posts")
                        .param("sort", "answered")
                        .param("category", "health")
                        .header("Authorization", "Bearer " + aliceJwt))
                .andExpect(status().isOk())
                .andReturn();
        JsonNode aliceBody = mapper.readTree(aliceResult.getResponse().getContentAsString());
        JsonNode alicePosts = aliceBody.get("data");

        // Bob views the feed.
        MvcResult bobResult = mvc.perform(get("/api/v1/posts")
                        .param("sort", "answered")
                        .param("category", "health")
                        .header("Authorization", "Bearer " + bobJwt))
                .andExpect(status().isOk())
                .andReturn();
        JsonNode bobBody = mapper.readTree(bobResult.getResponse().getContentAsString());
        JsonNode bobPosts = bobBody.get("data");

        // 1. Both see the same post(s) — cached underlying query is shared.
        assertThat(alicePosts.size()).isEqualTo(1);
        assertThat(bobPosts.size()).isEqualTo(1);
        assertThat(alicePosts.get(0).get("id").asText()).isEqualTo(postId.toString());
        assertThat(bobPosts.get(0).get("id").asText()).isEqualTo(postId.toString());

        // 2. Per-viewer intercessorSummary differs — the boundary works.
        //    Alice's summary classifies Reactor as a friend (firstThree includes
        //    Reactor's name). Bob's summary classifies Reactor as Anonymous.
        JsonNode aliceSummary = alicePosts.get(0).get("intercessorSummary");
        JsonNode bobSummary = bobPosts.get(0).get("intercessorSummary");
        assertThat(aliceSummary)
                .as("Alice must see intercessorSummary (per-viewer enrichment)")
                .isNotNull();
        assertThat(bobSummary)
                .as("Bob must see intercessorSummary (per-viewer enrichment)")
                .isNotNull();

        // Same count (it's the same post with the same reaction).
        assertThat(aliceSummary.get("count").asLong())
                .isEqualTo(bobSummary.get("count").asLong());

        // But firstThree classification differs — Alice's friend appears by
        // displayName + isAnonymous=false; Bob's stranger appears as
        // isAnonymous=true with displayName="Anonymous".
        JsonNode aliceFirstThree = aliceSummary.get("firstThree");
        JsonNode bobFirstThree = bobSummary.get("firstThree");
        assertThat(aliceFirstThree.size()).isEqualTo(1);
        assertThat(bobFirstThree.size()).isEqualTo(1);

        boolean aliceAnon = aliceFirstThree.get(0).get("isAnonymous").asBoolean();
        boolean bobAnon = bobFirstThree.get(0).get("isAnonymous").asBoolean();
        assertThat(aliceAnon)
                .as("Reactor is Alice's friend — must classify as named (isAnonymous=false)")
                .isFalse();
        assertThat(bobAnon)
                .as("Reactor is NOT Bob's friend — must classify as anonymous (isAnonymous=true)")
                .isTrue();
        assertThat(bobFirstThree.get(0).get("displayName").asText()).isEqualTo("Anonymous");

        // Bonus: verify it's actually one cached entry, not two.
        Cache cache = cacheManager.getCache("answered-feed");
        assertThat(cache).isNotNull();
        assertThat(cache.get(cacheKey("health", null, null, 1, 20)))
                .as("Single viewer-agnostic cache entry exists (not per-viewer)")
                .isNotNull();
    }
}
