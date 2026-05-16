package com.worshiproom.post;

import com.worshiproom.post.dto.PostDto;
import com.worshiproom.post.dto.PostListResponse;
import com.worshiproom.support.AbstractIntegrationTest;
import com.worshiproom.user.User;
import com.worshiproom.user.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.jdbc.core.JdbcTemplate;

import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Spec 7.4 — Integration tests for {@link FriendPrayersService} using
 * Testcontainers PostgreSQL via {@link AbstractIntegrationTest}.
 *
 * <p>Each test seeds users, friend relationships, posts (with explicit
 * {@code created_at} when the test verifies the 24h window or sort order),
 * and quick-lift sessions as needed. Cleanup runs in {@code @BeforeEach}
 * — the singleton container persists rows across test classes, so explicit
 * cleanup is mandatory per the {@code AbstractIntegrationTest} JavaDoc.
 */
class FriendPrayersServiceTest extends AbstractIntegrationTest {

    @Autowired private FriendPrayersService friendPrayersService;
    @Autowired private PostRepository postRepository;
    @Autowired private UserRepository userRepository;
    @Autowired private JdbcTemplate jdbc;

    private User viewer;
    private User friend;
    private User stranger;

    @BeforeEach
    void clean() {
        // Order matters: child tables before users.
        jdbc.update("DELETE FROM quick_lift_sessions");
        jdbc.update("DELETE FROM user_mutes");
        jdbc.update("DELETE FROM friend_relationships");
        postRepository.deleteAll();
        userRepository.deleteAll();

        viewer = userRepository.saveAndFlush(uniqueUser("viewer"));
        friend = userRepository.saveAndFlush(uniqueUser("friend"));
        stranger = userRepository.saveAndFlush(uniqueUser("stranger"));
    }

    private static User uniqueUser(String tag) {
        return new User(
                tag + "-" + UUID.randomUUID().toString().substring(0, 8) + "@test.local",
                "$2a$10$placeholderplaceholderplaceholderplaceholderplaceholder",
                tag.substring(0, 1).toUpperCase() + tag.substring(1), "Test", "UTC");
    }

    /** Seed an active friend relationship (post author → viewer). Direction matters. */
    private void seedFriendship(UUID authorId, UUID viewerId) {
        jdbc.update("""
                INSERT INTO friend_relationships (user_id, friend_user_id, status)
                VALUES (?, ?, 'active')
                """, authorId, viewerId);
    }

    private void seedFriendshipWithStatus(UUID authorId, UUID viewerId, String status) {
        jdbc.update("""
                INSERT INTO friend_relationships (user_id, friend_user_id, status)
                VALUES (?, ?, ?)
                """, authorId, viewerId, status);
    }

    /** Seed a post with explicit created_at and visibility. */
    private UUID seedPost(UUID authorId, String visibility, OffsetDateTime createdAt) {
        UUID id = UUID.randomUUID();
        jdbc.update("""
                INSERT INTO posts (id, user_id, post_type, content, visibility, moderation_status,
                                   created_at, updated_at, last_activity_at)
                VALUES (?, ?, 'prayer_request', 'pray for me', ?, 'approved',
                        ?, ?, ?)
                """, id, authorId, visibility, createdAt, createdAt, createdAt);
        return id;
    }

    /** Seed a "now-ish" public post by a friend (most-recent-eligible default). */
    private UUID seedFreshFriendPost() {
        return seedPost(friend.getId(), "public", OffsetDateTime.now(ZoneOffset.UTC).minusMinutes(5));
    }

    private void seedCompletedQuickLift(UUID userId, UUID postId) {
        OffsetDateTime started = OffsetDateTime.now(ZoneOffset.UTC).minusSeconds(60);
        jdbc.update("""
                INSERT INTO quick_lift_sessions (id, user_id, post_id, started_at, completed_at)
                VALUES (?, ?, ?, ?, ?)
                """, UUID.randomUUID(), userId, postId, started, started.plusSeconds(31));
    }

    private void seedStartedQuickLift(UUID userId, UUID postId) {
        jdbc.update("""
                INSERT INTO quick_lift_sessions (id, user_id, post_id, started_at)
                VALUES (?, ?, ?, ?)
                """, UUID.randomUUID(), userId, postId, OffsetDateTime.now(ZoneOffset.UTC).minusSeconds(15));
    }

    private void seedMute(UUID muterId, UUID mutedId) {
        jdbc.update("""
                INSERT INTO user_mutes (muter_id, muted_id) VALUES (?, ?)
                """, muterId, mutedId);
    }

    private List<UUID> idsOf(PostListResponse resp) {
        return resp.data().stream().map(PostDto::id).toList();
    }

    // ─── Test 1: G-MAX-THREE-POSTS ─────────────────────────────────────────

    @Test
    void returnsAtMostThreePosts() {
        seedFriendship(friend.getId(), viewer.getId());
        for (int i = 0; i < 5; i++) {
            // Distinct timestamps so we can verify which 3 come through later.
            seedPost(friend.getId(), "public",
                    OffsetDateTime.now(ZoneOffset.UTC).minusMinutes(60 - i));
        }

        PostListResponse resp = friendPrayersService.listFriendPrayersToday(viewer.getId(), "req-1");

        assertThat(resp.data()).hasSize(3);
        assertThat(resp.meta().totalCount()).isEqualTo(3L);
        assertThat(resp.meta().page()).isEqualTo(1);
        assertThat(resp.meta().limit()).isEqualTo(3);
        assertThat(resp.meta().hasNextPage()).isFalse();
        assertThat(resp.meta().hasPrevPage()).isFalse();
        assertThat(resp.meta().requestId()).isEqualTo("req-1");
    }

    // ─── Test 2: G-NOT-PRAYED-EXCLUSION (completed branch) ─────────────────

    @Test
    void excludesCompletedQuickLiftPosts() {
        seedFriendship(friend.getId(), viewer.getId());
        UUID liftedPostId = seedFreshFriendPost();
        UUID untouchedPostId = seedFreshFriendPost();
        seedCompletedQuickLift(viewer.getId(), liftedPostId);

        PostListResponse resp = friendPrayersService.listFriendPrayersToday(viewer.getId(), "req-2");

        assertThat(idsOf(resp))
                .contains(untouchedPostId)
                .doesNotContain(liftedPostId);
    }

    // ─── Test 3: G-NOT-PRAYED-EXCLUSION (incomplete branch) ────────────────

    @Test
    void includesStartedNotCompletedQuickLift() {
        seedFriendship(friend.getId(), viewer.getId());
        UUID startedPostId = seedFreshFriendPost();
        seedStartedQuickLift(viewer.getId(), startedPostId);

        PostListResponse resp = friendPrayersService.listFriendPrayersToday(viewer.getId(), "req-3");

        // Started-but-not-completed Quick Lift does NOT count as "prayed for" per MPD-1.
        assertThat(idsOf(resp)).containsExactly(startedPostId);
    }

    // ─── Test 4: G-FRIENDS-ONLY ────────────────────────────────────────────

    @Test
    void excludesNonFriendPosts() {
        seedFriendship(friend.getId(), viewer.getId());
        UUID strangerPost = seedPost(stranger.getId(), "public",
                OffsetDateTime.now(ZoneOffset.UTC).minusMinutes(2));
        UUID friendPost = seedFreshFriendPost();

        PostListResponse resp = friendPrayersService.listFriendPrayersToday(viewer.getId(), "req-4");

        assertThat(idsOf(resp))
                .contains(friendPost)
                .doesNotContain(strangerPost);
    }

    // ─── Test 5: G-ACTIVE-RELATIONSHIPS-ONLY ───────────────────────────────

    @Test
    void excludesBlockedFriendPosts() {
        // Friend is blocked rather than active — posts must NOT surface.
        seedFriendshipWithStatus(friend.getId(), viewer.getId(), "blocked");
        UUID blockedPost = seedFreshFriendPost();

        PostListResponse resp = friendPrayersService.listFriendPrayersToday(viewer.getId(), "req-5");

        assertThat(idsOf(resp)).doesNotContain(blockedPost);
    }

    // ─── Test 6: G-VISIBILITY-RESPECTED ────────────────────────────────────

    @Test
    void respectsVisibilityPredicate() {
        seedFriendship(friend.getId(), viewer.getId());
        OffsetDateTime now = OffsetDateTime.now(ZoneOffset.UTC).minusMinutes(5);
        // Private post by a friend: only the author should see it; viewer is NOT the author.
        UUID privatePost = seedPost(friend.getId(), "private", now);
        // Friends-only post by friend: visible to viewer because viewer IS a friend.
        UUID friendsOnlyPost = seedPost(friend.getId(), "friends", now.minusMinutes(1));
        // Public post by friend: always visible.
        UUID publicPost = seedPost(friend.getId(), "public", now.minusMinutes(2));

        PostListResponse resp = friendPrayersService.listFriendPrayersToday(viewer.getId(), "req-6");

        assertThat(idsOf(resp))
                .contains(friendsOnlyPost, publicPost)
                .doesNotContain(privatePost);
    }

    // ─── Test 7: G-24-HOUR-WINDOW ──────────────────────────────────────────

    @Test
    void excludesPostsOlderThan24h() {
        seedFriendship(friend.getId(), viewer.getId());
        UUID freshPost = seedFreshFriendPost();
        UUID stalePost = seedPost(friend.getId(), "public",
                OffsetDateTime.now(ZoneOffset.UTC).minusHours(25));

        PostListResponse resp = friendPrayersService.listFriendPrayersToday(viewer.getId(), "req-7");

        assertThat(idsOf(resp))
                .contains(freshPost)
                .doesNotContain(stalePost);
    }

    // ─── Test 8: G-MUTES-RESPECTED ─────────────────────────────────────────

    @Test
    void excludesPostsByMutedFriend() {
        // Viewer has muted the friend even though the friendship is still active.
        seedFriendship(friend.getId(), viewer.getId());
        seedMute(viewer.getId(), friend.getId());
        UUID mutedAuthorPost = seedFreshFriendPost();

        PostListResponse resp = friendPrayersService.listFriendPrayersToday(viewer.getId(), "req-8");

        assertThat(idsOf(resp)).doesNotContain(mutedAuthorPost);
    }

    // ─── Test 9: sort order ────────────────────────────────────────────────

    @Test
    void returnsMostRecentWhenMoreThanThreeEligible() {
        seedFriendship(friend.getId(), viewer.getId());
        OffsetDateTime base = OffsetDateTime.now(ZoneOffset.UTC).minusHours(1);
        // Seed 5 posts at distinct timestamps (oldest first, then newer ones).
        UUID p1 = seedPost(friend.getId(), "public", base.minusMinutes(50)); // oldest
        UUID p2 = seedPost(friend.getId(), "public", base.minusMinutes(40));
        UUID p3 = seedPost(friend.getId(), "public", base.minusMinutes(30));
        UUID p4 = seedPost(friend.getId(), "public", base.minusMinutes(20));
        UUID p5 = seedPost(friend.getId(), "public", base.minusMinutes(10)); // newest

        PostListResponse resp = friendPrayersService.listFriendPrayersToday(viewer.getId(), "req-9");

        // Expected: top 3 most-recent = [p5, p4, p3] in that order.
        assertThat(idsOf(resp)).containsExactly(p5, p4, p3);
        assertThat(idsOf(resp)).doesNotContain(p1, p2);
    }
}
