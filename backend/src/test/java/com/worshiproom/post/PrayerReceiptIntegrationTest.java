package com.worshiproom.post;

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
import org.springframework.cache.Cache;
import org.springframework.cache.CacheManager;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.test.web.servlet.MockMvc;

import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Spec 6.1 — end-to-end coverage of Prayer Receipt endpoints. LOAD-BEARING for
 * the privacy model (Gate-31 author-only access, Gate-32 wire-format leak
 * prevention).
 *
 * <p><b>Cache architecture note:</b> Tests run under the test profile, which
 * uses {@link org.springframework.cache.concurrent.ConcurrentMapCacheManager}
 * via {@code CacheConfig#inMemoryCacheManager}. @{@code Cacheable} and
 * @{@code CacheEvict} behavior is identical to Redis for the purposes of the
 * invariants this test covers: store, hit, evict. The Redis-specific TTL byte
 * precision (test scenario 8 in plan) is enforced statically by
 * {@code RepoWideTtlEnforcementTest} + the {@code application.properties}
 * declaration; the prod-only Redis path is covered at runtime under
 * {@code SPRING_PROFILES_ACTIVE=prod}.
 *
 * <p>Plan scenarios covered: 1, 2, 3, 4, 5, 6, 7, 9, 10, 11, 12.
 * Scenario 8 (Redis TTL byte precision) is delegated to
 * {@code RepoWideTtlEnforcementTest} + manual prod verification.
 */
@AutoConfigureMockMvc
class PrayerReceiptIntegrationTest extends AbstractIntegrationTest {

    private static final String TEST_JWT_SECRET =
            "test-jwt-secret-at-least-32-bytes-long-xxxxxxxxxxxxxx";

    @DynamicPropertySource
    static void properties(DynamicPropertyRegistry registry) {
        registry.add("jwt.secret", () -> TEST_JWT_SECRET);
        registry.add("auth.rate-limit.per-email.capacity", () -> "1000");
        registry.add("auth.rate-limit.per-ip.capacity", () -> "10000");
        // Sized so a single test can issue up to 60 read calls (Test 7 cache-hit loop)
        // without bumping the budget. Share rate limit kept small so scenario 11 exercises 429.
        registry.add("worshiproom.prayer-receipt.read.rate-limit.max-per-hour", () -> "1000");
        registry.add("worshiproom.prayer-receipt.share.rate-limit.max-per-post-per-day", () -> "5");
        // Reaction rate limit raised so toggle/un-toggle cache-eviction tests don't 429.
        registry.add("worshiproom.reactions.rate-limit.max-per-hour", () -> "100");
    }

    @Autowired private MockMvc mvc;
    @Autowired private ObjectMapper mapper;
    @Autowired private UserRepository userRepository;
    @Autowired private FriendRelationshipRepository friendRepo;
    @Autowired private JwtService jwtService;
    @Autowired private JdbcTemplate jdbc;
    @Autowired private CacheManager cacheManager;

    private User author;
    private User stranger;
    private String authorJwt;
    private String strangerJwt;

    @BeforeEach
    void seedAndClearCache() {
        jdbc.update("DELETE FROM activity_log");
        jdbc.update("DELETE FROM friend_relationships");
        jdbc.update("DELETE FROM post_reactions");
        jdbc.update("DELETE FROM post_bookmarks");
        jdbc.update("DELETE FROM post_comments");
        jdbc.update("DELETE FROM posts");
        jdbc.update("DELETE FROM users");
        Cache c = cacheManager.getCache("prayer-receipt");
        if (c != null) c.clear();

        author = userRepository.saveAndFlush(new User("author-pr@test.local", "$2a$10$x",
                "Pat", "Author", "UTC"));
        stranger = userRepository.saveAndFlush(new User("stranger-pr@test.local", "$2a$10$x",
                "Sam", "Stranger", "UTC"));
        authorJwt = jwtService.generateToken(author.getId(), false);
        strangerJwt = jwtService.generateToken(stranger.getId(), false);
    }

    private UUID seedPost(UUID userId, boolean anonymous, boolean deleted) {
        UUID id = UUID.randomUUID();
        jdbc.update("""
                INSERT INTO posts (id, user_id, post_type, content, visibility, moderation_status,
                                   is_anonymous, is_deleted, deleted_at, praying_count)
                VALUES (?, ?, 'prayer_request', 'receipt test', 'public', 'approved', ?, ?, ?, 0)
                """, id, userId, anonymous, deleted,
                deleted ? java.time.OffsetDateTime.now() : null);
        return id;
    }

    private User seedUser(String email, String first, String last) {
        return userRepository.saveAndFlush(new User(email, "$2a$10$x", first, last, "UTC"));
    }

    private User seedFriend(UUID authorUserId, String email, String first, String last) {
        User friend = seedUser(email, first, last);
        // Phase 2.5 stores mutual friendships as two rows; we only need the A→B
        // direction (author → friend) for the PrayerReceipt classification query.
        friendRepo.saveAndFlush(new FriendRelationship(
                authorUserId, friend.getId(), FriendRelationshipStatus.ACTIVE));
        return friend;
    }

    private void seedPrayingReaction(UUID postId, UUID userId) {
        jdbc.update("""
                INSERT INTO post_reactions (post_id, user_id, reaction_type)
                VALUES (?, ?, 'praying')
                """, postId, userId);
    }

    private void setPrayingCount(UUID postId, int n) {
        jdbc.update("UPDATE posts SET praying_count = ? WHERE id = ?", n, postId);
    }

    // ─── 1. Author fetches own receipt — 200 + shape ──────────────────────────

    @Test
    void authorFetchesOwnReceipt() throws Exception {
        UUID postId = seedPost(author.getId(), false, false);
        setPrayingCount(postId, 2);
        User friend = seedFriend(author.getId(), "f1@test", "Friend", "One");
        seedPrayingReaction(postId, friend.getId());
        User nonFriend = seedUser("nf1@test", "NonFriend", "One");
        seedPrayingReaction(postId, nonFriend.getId());

        mvc.perform(get("/api/v1/posts/{id}/prayer-receipt", postId)
                        .header("Authorization", "Bearer " + authorJwt))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.totalCount").value(2))
                .andExpect(jsonPath("$.data.attributedIntercessors").isArray())
                .andExpect(jsonPath("$.data.attributedIntercessors.length()").value(1))
                .andExpect(jsonPath("$.data.attributedIntercessors[0].displayName").value("Friend"))
                .andExpect(jsonPath("$.data.anonymousCount").value(1))
                .andExpect(jsonPath("$.meta.requestId").exists());
    }

    // ─── 2. Non-author fetches another's receipt — 403 + no leak (Gate-31) ────

    @Test
    void nonAuthorFetchesReceipt_returns403WithNoIntercessorData() throws Exception {
        UUID postId = seedPost(author.getId(), false, false);
        setPrayingCount(postId, 1);
        User friend = seedFriend(author.getId(), "f1@test", "SecretName", "Hidden");
        seedPrayingReaction(postId, friend.getId());

        String body = mvc.perform(get("/api/v1/posts/{id}/prayer-receipt", postId)
                        .header("Authorization", "Bearer " + strangerJwt))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.code").value("FORBIDDEN"))
                .andReturn().getResponse().getContentAsString();
        // Gate-31: zero intercessor data of any kind in the response body
        assertThat(body).doesNotContain("SecretName");
        assertThat(body).doesNotContain(friend.getId().toString());
        assertThat(body).doesNotContain("totalCount");
        assertThat(body).doesNotContain("attributedIntercessors");
        assertThat(body).doesNotContain("anonymousCount");
    }

    // ─── 3. Unauthenticated fetch — 401 ─────────────────────────────────────

    @Test
    void unauthenticatedFetch_returns401() throws Exception {
        UUID postId = seedPost(author.getId(), false, false);
        mvc.perform(get("/api/v1/posts/{id}/prayer-receipt", postId))
                .andExpect(status().isUnauthorized());
    }

    // ─── 4. Anonymous-post author fetches own receipt — 200 ─────────────────

    @Test
    void anonymousPostAuthorFetchesOwnReceipt() throws Exception {
        // is_anonymous=true; author can still fetch their own receipt because
        // server checks viewer.userId == post.userId. Anonymity is a wire-presentation
        // concern, not an auth boundary.
        UUID postId = seedPost(author.getId(), true, false);
        setPrayingCount(postId, 0);
        mvc.perform(get("/api/v1/posts/{id}/prayer-receipt", postId)
                        .header("Authorization", "Bearer " + authorJwt))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.totalCount").value(0));
    }

    // ─── 5. Friend classification — 2 friends + 3 non-friends (Gate-32) ─────

    @Test
    void friendClassification_2friends3nonfriends() throws Exception {
        UUID postId = seedPost(author.getId(), false, false);
        setPrayingCount(postId, 5);
        User friendA = seedFriend(author.getId(), "fa@test", "Alice", "A");
        User friendB = seedFriend(author.getId(), "fb@test", "Bob", "B");
        User nf1 = seedUser("nf1@test", "NonOne", "X");
        User nf2 = seedUser("nf2@test", "NonTwo", "X");
        User nf3 = seedUser("nf3@test", "NonThree", "X");
        seedPrayingReaction(postId, friendA.getId());
        seedPrayingReaction(postId, friendB.getId());
        seedPrayingReaction(postId, nf1.getId());
        seedPrayingReaction(postId, nf2.getId());
        seedPrayingReaction(postId, nf3.getId());

        mvc.perform(get("/api/v1/posts/{id}/prayer-receipt", postId)
                        .header("Authorization", "Bearer " + authorJwt))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.totalCount").value(5))
                .andExpect(jsonPath("$.data.attributedIntercessors.length()").value(2))
                // Sorted alphabetically: Alice, Bob
                .andExpect(jsonPath("$.data.attributedIntercessors[0].displayName").value("Alice"))
                .andExpect(jsonPath("$.data.attributedIntercessors[1].displayName").value("Bob"))
                .andExpect(jsonPath("$.data.anonymousCount").value(3));
    }

    // ─── 6. Wire-format leak check — zero non-friend identity in body (Gate-32) ─

    @Test
    void wireFormatContainsZeroNonFriendIdentity() throws Exception {
        UUID postId = seedPost(author.getId(), false, false);
        setPrayingCount(postId, 5);
        User friendA = seedFriend(author.getId(), "fa@test", "Alice", "A");
        User friendB = seedFriend(author.getId(), "fb@test", "Bob", "B");
        User nf1 = seedUser("nonfriend1@test", "Stealth", "X");
        User nf2 = seedUser("nonfriend2@test", "Hidden", "X");
        User nf3 = seedUser("nonfriend3@test", "Anonymous", "X");
        seedPrayingReaction(postId, friendA.getId());
        seedPrayingReaction(postId, friendB.getId());
        seedPrayingReaction(postId, nf1.getId());
        seedPrayingReaction(postId, nf2.getId());
        seedPrayingReaction(postId, nf3.getId());

        String body = mvc.perform(get("/api/v1/posts/{id}/prayer-receipt", postId)
                        .header("Authorization", "Bearer " + authorJwt))
                .andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString();

        // Non-friend UUIDs MUST NOT appear in any form
        for (User nf : new User[]{nf1, nf2, nf3}) {
            assertThat(body).doesNotContain(nf.getId().toString());
            assertThat(body).doesNotContain(nf.getId().toString().replace("-", ""));
        }
        // Non-friend display names MUST NOT appear
        assertThat(body).doesNotContain("Stealth");
        assertThat(body).doesNotContain("Hidden");
        assertThat(body).doesNotContain("Anonymous");
        // Non-friend email handles MUST NOT appear (defense in depth — emails aren't in
        // AttributedIntercessor by design, but ensure no accidental field leak)
        assertThat(body).doesNotContain("nonfriend1");
        assertThat(body).doesNotContain("nonfriend2");
        assertThat(body).doesNotContain("nonfriend3");
    }

    // ─── 7. Cache hit — service called once across two requests ─────────────

    @Test
    void cacheHit_serviceCachedAcrossRequests() throws Exception {
        UUID postId = seedPost(author.getId(), false, false);
        setPrayingCount(postId, 1);
        User friend = seedFriend(author.getId(), "f7@test", "Cached", "F");
        seedPrayingReaction(postId, friend.getId());

        // First fetch — cache miss (service hits DB)
        mvc.perform(get("/api/v1/posts/{id}/prayer-receipt", postId)
                        .header("Authorization", "Bearer " + authorJwt))
                .andExpect(status().isOk());

        Cache cache = cacheManager.getCache("prayer-receipt");
        assertThat(cache).isNotNull();
        assertThat(cache.get(postId)).isNotNull();

        // Mutate the DB underneath the cache: bump praying_count directly
        setPrayingCount(postId, 999);

        // Second fetch — cache HIT, still returns the stale value (proves cache is used)
        mvc.perform(get("/api/v1/posts/{id}/prayer-receipt", postId)
                        .header("Authorization", "Bearer " + authorJwt))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.totalCount").value(1));
    }

    // ─── 9. Cache invalidation on reaction insert ───────────────────────────

    @Test
    void cacheInvalidatedOnReactionInsert() throws Exception {
        UUID postId = seedPost(author.getId(), false, false);
        setPrayingCount(postId, 0);

        // Prime the cache: fetch receipt (count=0)
        mvc.perform(get("/api/v1/posts/{id}/prayer-receipt", postId)
                        .header("Authorization", "Bearer " + authorJwt))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.totalCount").value(0));

        // A non-author taps Pray on the post — triggers @CacheEvict on toggle
        mvc.perform(post("/api/v1/posts/{id}/reactions", postId)
                        .header("Authorization", "Bearer " + strangerJwt)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"reactionType\":\"praying\"}"))
                .andExpect(status().isCreated());

        // Re-fetch — cache was invalidated, fresh value (count=1)
        mvc.perform(get("/api/v1/posts/{id}/prayer-receipt", postId)
                        .header("Authorization", "Bearer " + authorJwt))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.totalCount").value(1));
    }

    // ─── 10. Cache invalidation on reaction delete (toggle off) ─────────────

    @Test
    void cacheInvalidatedOnReactionDelete() throws Exception {
        UUID postId = seedPost(author.getId(), false, false);
        setPrayingCount(postId, 0);

        // Stranger adds a praying reaction (count becomes 1 via the toggle path)
        mvc.perform(post("/api/v1/posts/{id}/reactions", postId)
                        .header("Authorization", "Bearer " + strangerJwt)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"reactionType\":\"praying\"}"))
                .andExpect(status().isCreated());

        // Author fetches receipt — primes the cache at count=1
        mvc.perform(get("/api/v1/posts/{id}/prayer-receipt", postId)
                        .header("Authorization", "Bearer " + authorJwt))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.totalCount").value(1));

        // Stranger toggles off (sends praying again — same body — toggles to removed)
        mvc.perform(post("/api/v1/posts/{id}/reactions", postId)
                        .header("Authorization", "Bearer " + strangerJwt)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"reactionType\":\"praying\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.state").value("removed"));

        // Re-fetch — cache evicted, count back to 0
        mvc.perform(get("/api/v1/posts/{id}/prayer-receipt", postId)
                        .header("Authorization", "Bearer " + authorJwt))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.totalCount").value(0));
    }

    // ─── 11. Share rate limit — 5 succeed (204), 6th returns 429 ────────────

    @Test
    void shareRateLimitedAtSixth() throws Exception {
        UUID postId = seedPost(author.getId(), false, false);
        setPrayingCount(postId, 1);

        for (int i = 0; i < 5; i++) {
            mvc.perform(post("/api/v1/posts/{id}/prayer-receipt/share", postId)
                            .header("Authorization", "Bearer " + authorJwt))
                    .andExpect(status().isNoContent());
        }

        mvc.perform(post("/api/v1/posts/{id}/prayer-receipt/share", postId)
                        .header("Authorization", "Bearer " + authorJwt))
                .andExpect(status().isTooManyRequests())
                .andExpect(jsonPath("$.code").value("RATE_LIMITED"))
                .andExpect(header().exists("Retry-After"));
    }

    // ─── 12. Empty receipt — praying_count==0 → 200 with zeroes ─────────────

    @Test
    void emptyReceiptReturnsZeroes() throws Exception {
        UUID postId = seedPost(author.getId(), false, false);
        setPrayingCount(postId, 0);

        mvc.perform(get("/api/v1/posts/{id}/prayer-receipt", postId)
                        .header("Authorization", "Bearer " + authorJwt))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.totalCount").value(0))
                .andExpect(jsonPath("$.data.attributedIntercessors.length()").value(0))
                .andExpect(jsonPath("$.data.anonymousCount").value(0));
    }

    // ─── Bonus: 404 for soft-deleted post (uniform for author AND non-author) ─

    @Test
    void softDeletedPost_returns404ForAuthor() throws Exception {
        UUID postId = seedPost(author.getId(), false, /* deleted */ true);
        setPrayingCount(postId, 3);
        mvc.perform(get("/api/v1/posts/{id}/prayer-receipt", postId)
                        .header("Authorization", "Bearer " + authorJwt))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.code").value("POST_NOT_FOUND"));
    }

    @Test
    void softDeletedPost_returns404ForNonAuthor() throws Exception {
        // Critical: non-author must also see 404, not 403, otherwise the differential
        // status leaks existence (advisor flag — Step 5 controller change addressed this).
        UUID postId = seedPost(author.getId(), false, /* deleted */ true);
        setPrayingCount(postId, 3);
        mvc.perform(get("/api/v1/posts/{id}/prayer-receipt", postId)
                        .header("Authorization", "Bearer " + strangerJwt))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.code").value("POST_NOT_FOUND"));
    }

    // ─── Bonus: 404 for nonexistent post ────────────────────────────────────

    @Test
    void nonexistentPost_returns404() throws Exception {
        mvc.perform(get("/api/v1/posts/{id}/prayer-receipt", UUID.randomUUID())
                        .header("Authorization", "Bearer " + authorJwt))
                .andExpect(status().isNotFound());
    }
}
