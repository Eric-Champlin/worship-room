package com.worshiproom.post;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.worshiproom.support.AbstractIntegrationTest;
import com.worshiproom.user.User;
import com.worshiproom.user.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.cache.CacheManager;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;

import java.time.OffsetDateTime;
import java.util.HashSet;
import java.util.Set;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Spec 6.6b — Answered Wall feed read-path integration tests.
 *
 * <p>Covers T8, T9, T21, T22 from spec-6-6b.md § 9.
 *
 * <p>Exercises {@code GET /api/v1/posts?sort=answered[&category=...]} end-to-
 * end through the cache layer ({@link AnsweredFeedCache}) and the per-request
 * enrichment in {@link PostService#listFeed}.
 */
@AutoConfigureMockMvc
class AnsweredFeedTest extends AbstractIntegrationTest {

    @Autowired private MockMvc mvc;
    @Autowired private ObjectMapper mapper;
    @Autowired private UserRepository userRepository;
    @Autowired private JdbcTemplate jdbc;
    @Autowired private CacheManager cacheManager;

    private User alice;
    private User deletedUser;

    @BeforeEach
    void seed() {
        // Clean slate. The answered-feed cache (dev/test: ConcurrentMapCacheManager)
        // is shared across the JVM's tests and holds Post entities from prior test
        // runs. If we don't clear it, the next test's GET sees stale posts whose
        // authors were DELETED by THIS test's @BeforeEach, and PostMapper.toDtoList
        // throws "Post X references missing user Y" when it can't resolve authors.
        var answeredCache = cacheManager.getCache("answered-feed");
        if (answeredCache != null) answeredCache.clear();

        jdbc.update("DELETE FROM activity_log");
        jdbc.update("DELETE FROM friend_relationships");
        jdbc.update("DELETE FROM post_reactions");
        jdbc.update("DELETE FROM post_bookmarks");
        jdbc.update("DELETE FROM post_comments");
        jdbc.update("DELETE FROM posts");
        jdbc.update("DELETE FROM users");

        alice = userRepository.saveAndFlush(new User("alice-feed@test.local", "$2a$10$x",
                "Alice", "Anderson", "UTC"));
        // T22 fixture — deleted author. The post is otherwise eligible for the
        // Answered Wall (public + approved + isAnswered=true); authorActive()
        // should still exclude it.
        deletedUser = new User("deleted-feed@test.local", "$2a$10$x",
                "Deleted", "User", "UTC");
        deletedUser.setDeleted(true);
        deletedUser = userRepository.saveAndFlush(deletedUser);
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

    private UUID seedUnansweredPost(UUID authorId, String category) {
        UUID id = UUID.randomUUID();
        jdbc.update("""
                INSERT INTO posts (id, user_id, post_type, content, category, visibility, moderation_status,
                                   is_deleted, is_answered)
                VALUES (?, ?, 'prayer_request', 'pray for me', ?, 'public', 'approved',
                        false, false)
                """, id, authorId, category);
        return id;
    }

    private Set<String> idsOf(JsonNode data) {
        Set<String> ids = new HashSet<>();
        for (JsonNode p : data) {
            ids.add(p.get("id").asText());
        }
        return ids;
    }

    // ─── T8: ?category=health narrows the answered feed ──────────────────────

    @Test
    void getAnswered_withCategoryHealth_returnsOnlyHealthAnsweredPosts() throws Exception {
        UUID healthAnswered = seedAnsweredPost(alice.getId(), "health", OffsetDateTime.now());
        UUID familyAnswered = seedAnsweredPost(alice.getId(), "family", OffsetDateTime.now().minusHours(1));
        UUID healthUnanswered = seedUnansweredPost(alice.getId(), "health");

        MvcResult result = mvc.perform(get("/api/v1/posts")
                        .param("sort", "answered")
                        .param("category", "health"))
                .andExpect(status().isOk())
                .andReturn();
        JsonNode body = mapper.readTree(result.getResponse().getContentAsString());
        Set<String> ids = idsOf(body.get("data"));

        assertThat(ids).contains(healthAnswered.toString());
        assertThat(ids).doesNotContain(familyAnswered.toString(),
                                       healthUnanswered.toString());
    }

    // ─── T9: no category param returns ALL answered (no filter) ──────────────

    @Test
    void getAnswered_noCategory_returnsAllAnsweredRegardlessOfCategory() throws Exception {
        UUID healthAnswered = seedAnsweredPost(alice.getId(), "health", OffsetDateTime.now());
        UUID familyAnswered = seedAnsweredPost(alice.getId(), "family", OffsetDateTime.now().minusHours(1));
        UUID workAnswered = seedAnsweredPost(alice.getId(), "work", OffsetDateTime.now().minusHours(2));
        UUID unanswered = seedUnansweredPost(alice.getId(), "health");

        MvcResult result = mvc.perform(get("/api/v1/posts")
                        .param("sort", "answered"))
                .andExpect(status().isOk())
                .andReturn();
        JsonNode body = mapper.readTree(result.getResponse().getContentAsString());
        Set<String> ids = idsOf(body.get("data"));

        assertThat(ids).contains(healthAnswered.toString(),
                                 familyAnswered.toString(),
                                 workAnswered.toString());
        assertThat(ids).doesNotContain(unanswered.toString());
    }

    // ─── T21: notExpired() does NOT exclude old prayer_request posts ─────────
    // Spec 4.6 encouragement expiry only applies to post_type='encouragement'.
    // prayer_request answered posts created 100 days ago must still appear on
    // the Answered Wall. This guards against any future spec accidentally
    // adding expires_at < NOW() to the answered feed's visibility filter.

    @Test
    void getAnswered_includesOldAnsweredPrayerRequests() throws Exception {
        UUID old = UUID.randomUUID();
        // Set both created_at AND answered_at far in the past; only encouragement
        // posts expire at 24h, prayer_request never expires from the feed.
        jdbc.update("""
                INSERT INTO posts (id, user_id, post_type, content, category, visibility,
                                   moderation_status, is_deleted, is_answered, answered_text,
                                   answered_at, created_at)
                VALUES (?, ?, 'prayer_request', 'old answered', 'health', 'public', 'approved',
                        false, true, 'praise God', ?, ?)
                """, old, alice.getId(),
                OffsetDateTime.now().minusDays(100),
                OffsetDateTime.now().minusDays(120));

        MvcResult result = mvc.perform(get("/api/v1/posts")
                        .param("sort", "answered"))
                .andExpect(status().isOk())
                .andReturn();
        JsonNode body = mapper.readTree(result.getResponse().getContentAsString());
        Set<String> ids = idsOf(body.get("data"));

        assertThat(ids)
                .as("100-day-old answered prayer_request must appear — prayer_request has no feed expiry")
                .contains(old.toString());
    }

    // ─── T22: deleted-author posts are excluded from the Answered Wall ───────

    @Test
    void getAnswered_excludesPostsByDeletedAuthor() throws Exception {
        UUID aliceAnswered = seedAnsweredPost(alice.getId(), "health", OffsetDateTime.now());
        UUID deletedAuthorAnswered = seedAnsweredPost(deletedUser.getId(), "health",
                OffsetDateTime.now().minusMinutes(1));

        MvcResult result = mvc.perform(get("/api/v1/posts")
                        .param("sort", "answered"))
                .andExpect(status().isOk())
                .andReturn();
        JsonNode body = mapper.readTree(result.getResponse().getContentAsString());
        Set<String> ids = idsOf(body.get("data"));

        assertThat(ids)
                .as("Alice's answered post must appear")
                .contains(aliceAnswered.toString());
        assertThat(ids)
                .as("Deleted-author answered post must NOT appear (PostSpecifications.authorActive)")
                .doesNotContain(deletedAuthorAnswered.toString());
    }

    // ─── T22 sibling: banned-author posts are also excluded ──────────────────

    @Test
    void getAnswered_excludesPostsByBannedAuthor() throws Exception {
        User banned = new User("banned-feed@test.local", "$2a$10$x",
                "Banned", "User", "UTC");
        banned.setBanned(true);
        banned = userRepository.saveAndFlush(banned);
        UUID bannedAnswered = seedAnsweredPost(banned.getId(), "health",
                OffsetDateTime.now().minusMinutes(1));
        UUID aliceAnswered = seedAnsweredPost(alice.getId(), "health", OffsetDateTime.now());

        MvcResult result = mvc.perform(get("/api/v1/posts")
                        .param("sort", "answered"))
                .andExpect(status().isOk())
                .andReturn();
        JsonNode body = mapper.readTree(result.getResponse().getContentAsString());
        Set<String> ids = idsOf(body.get("data"));

        assertThat(ids).contains(aliceAnswered.toString());
        assertThat(ids)
                .as("Banned-author answered post must NOT appear")
                .doesNotContain(bannedAnswered.toString());
    }
}
