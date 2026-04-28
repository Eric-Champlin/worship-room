package com.worshiproom.post.engagement;

import com.worshiproom.mute.UserMute;
import com.worshiproom.mute.UserMuteRepository;
import com.worshiproom.post.PostRepository;
import com.worshiproom.post.dto.PostDto;
import com.worshiproom.post.dto.PostListResponse;
import com.worshiproom.post.engagement.dto.PerPostReaction;
import com.worshiproom.post.engagement.dto.ReactionsResponse;
import com.worshiproom.support.AbstractIntegrationTest;
import com.worshiproom.user.User;
import com.worshiproom.user.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.jdbc.core.JdbcTemplate;

import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Integration tests for {@link EngagementService} — exercises the reactions
 * map and bookmarks listing against Testcontainers PostgreSQL.
 */
class EngagementServiceTest extends AbstractIntegrationTest {

    @Autowired private EngagementService engagementService;
    @Autowired private PostRepository postRepository;
    @Autowired private UserRepository userRepository;
    @Autowired private UserMuteRepository muteRepository;
    @Autowired private JdbcTemplate jdbc;

    private User alice;
    private User bob;

    @BeforeEach
    void seed() {
        // friend_relationships rows must be cleared before users (FK CASCADE handles this
        // when users are deleted, but be explicit to avoid cross-test pollution).
        jdbc.update("DELETE FROM friend_relationships");
        muteRepository.deleteAll();
        postRepository.deleteAll();
        userRepository.deleteAll();
        alice = userRepository.saveAndFlush(new User(
                "alice-eng-" + UUID.randomUUID().toString().substring(0, 8) + "@test.local",
                "$2a$10$x", "Alice", "Anderson", "UTC"));
        bob = userRepository.saveAndFlush(new User(
                "bob-eng-" + UUID.randomUUID().toString().substring(0, 8) + "@test.local",
                "$2a$10$x", "Bob", "Bennett", "UTC"));
    }

    private UUID seedPost(UUID userId, String visibility, boolean deleted) {
        UUID id = UUID.randomUUID();
        jdbc.update("""
                INSERT INTO posts (id, user_id, post_type, content, visibility, moderation_status,
                                   is_deleted, deleted_at)
                VALUES (?, ?, 'prayer_request', 'eng test', ?, 'approved', ?, ?)
                """, id, userId, visibility, deleted,
                deleted ? java.time.OffsetDateTime.now() : null);
        return id;
    }

    private UUID seedPostWithCreatedAt(UUID userId, String visibility, String createdAt) {
        UUID id = UUID.randomUUID();
        jdbc.update("""
                INSERT INTO posts (id, user_id, post_type, content, visibility, moderation_status,
                                   created_at, updated_at, last_activity_at)
                VALUES (?, ?, 'prayer_request', 'eng test ' || ?, ?, 'approved',
                        ?::timestamptz, ?::timestamptz, ?::timestamptz)
                """, id, userId, createdAt, visibility, createdAt, createdAt, createdAt);
        return id;
    }

    private void seedReaction(UUID postId, UUID userId, String reactionType) {
        jdbc.update("""
                INSERT INTO post_reactions (post_id, user_id, reaction_type)
                VALUES (?, ?, ?)
                """, postId, userId, reactionType);
    }

    private void seedBookmark(UUID postId, UUID userId) {
        jdbc.update("""
                INSERT INTO post_bookmarks (post_id, user_id)
                VALUES (?, ?)
                """, postId, userId);
    }

    private void seedBookmarkWithCreatedAt(UUID postId, UUID userId, String createdAt) {
        jdbc.update("""
                INSERT INTO post_bookmarks (post_id, user_id, created_at)
                VALUES (?, ?, ?::timestamptz)
                """, postId, userId, createdAt);
    }

    private void seedFriendRelationship(UUID userId, UUID friendUserId) {
        jdbc.update("""
                INSERT INTO friend_relationships (user_id, friend_user_id, status)
                VALUES (?, ?, 'active')
                """, userId, friendUserId);
    }

    @Test
    void reactionsFor_emptyMap_whenUserHasNoEngagement() {
        ReactionsResponse resp = engagementService.reactionsFor(alice.getId());
        assertThat(resp.reactions()).isEmpty();
    }

    @Test
    void reactionsFor_combinesPrayingCandleAndBookmark_correctlyFlagged() {
        UUID postA = seedPost(bob.getId(), "public", false);
        UUID postB = seedPost(bob.getId(), "public", false);
        UUID postC = seedPost(bob.getId(), "public", false);
        UUID postD = seedPost(bob.getId(), "public", false);

        seedReaction(postA, alice.getId(), "praying");
        seedBookmark(postB, alice.getId());
        seedReaction(postC, alice.getId(), "praying");
        seedBookmark(postC, alice.getId());
        seedReaction(postD, alice.getId(), "candle");

        ReactionsResponse resp = engagementService.reactionsFor(alice.getId());
        // Spec 3.7 — candle reactions are now included in the read-side map. All four posts
        // should appear (the prior expectation of size=3 with postD absent reflected the
        // pre-3.7 Spec 3.4 Divergence 3 behavior, which is now superseded).
        assertThat(resp.reactions()).hasSize(4);
        assertThat(resp.reactions().get(postA)).isEqualTo(new PerPostReaction(true, false, false));
        assertThat(resp.reactions().get(postB)).isEqualTo(new PerPostReaction(false, false, true));
        assertThat(resp.reactions().get(postC)).isEqualTo(new PerPostReaction(true, false, true));
        assertThat(resp.reactions().get(postD)).isEqualTo(new PerPostReaction(false, true, false));
    }

    @Test
    void reactionsFor_includesCandleReactions_perSpec37() {
        // Spec 3.7 R6 — candle reactions are surfaced on /users/me/reactions
        // (replaces the prior Spec 3.4 Divergence 3 candle-excluded test).
        UUID postId = seedPost(bob.getId(), "public", false);
        seedReaction(postId, alice.getId(), "candle");

        ReactionsResponse resp = engagementService.reactionsFor(alice.getId());

        PerPostReaction reaction = resp.reactions().get(postId);
        assertThat(reaction).isNotNull();
        assertThat(reaction.isPraying()).isFalse();
        assertThat(reaction.isCandle()).isTrue();
        assertThat(reaction.isBookmarked()).isFalse();
    }

    @Test
    void reactionsFor_otherUserBookmarkAndReaction_excluded() {
        UUID postId = seedPost(bob.getId(), "public", false);
        seedReaction(postId, bob.getId(), "praying");
        seedBookmark(postId, bob.getId());

        ReactionsResponse resp = engagementService.reactionsFor(alice.getId());
        assertThat(resp.reactions()).isEmpty();
    }

    @Test
    void listBookmarks_visibilityPredicateApplied_unfriendedFriendsPostExcluded() {
        UUID bobsFriendsPost = seedPost(bob.getId(), "friends", false);
        // Alice and Bob are friends — Alice can see the post.
        seedFriendRelationship(bob.getId(), alice.getId());
        seedBookmark(bobsFriendsPost, alice.getId());

        PostListResponse withFriendship = engagementService.listBookmarks(
                alice.getId(), 1, 20, "req-1");
        assertThat(withFriendship.data()).extracting(PostDto::id).contains(bobsFriendsPost);

        // Remove the friendship — bookmark should disappear.
        jdbc.update("DELETE FROM friend_relationships WHERE user_id = ? AND friend_user_id = ?",
                bob.getId(), alice.getId());
        PostListResponse afterUnfriend = engagementService.listBookmarks(
                alice.getId(), 1, 20, "req-2");
        assertThat(afterUnfriend.data()).extracting(PostDto::id).doesNotContain(bobsFriendsPost);
    }

    @Test
    void listBookmarks_softDeletedPostExcluded() {
        UUID postId = seedPost(bob.getId(), "public", false);
        seedBookmark(postId, alice.getId());
        // Soft-delete the post.
        jdbc.update("UPDATE posts SET is_deleted = TRUE, deleted_at = NOW() WHERE id = ?", postId);

        PostListResponse resp = engagementService.listBookmarks(alice.getId(), 1, 20, "req-3");
        assertThat(resp.data()).extracting(PostDto::id).doesNotContain(postId);
    }

    @Test
    void listBookmarks_sortByBookmarkCreatedAtDesc_notPostCreatedAt() {
        // Old post, bookmarked NOW
        UUID oldPost = seedPostWithCreatedAt(bob.getId(), "public", "2026-01-01 00:00:00+00");
        // New post, bookmarked YESTERDAY
        UUID newPost = seedPostWithCreatedAt(bob.getId(), "public", "2026-04-25 00:00:00+00");

        seedBookmarkWithCreatedAt(oldPost, alice.getId(), "2026-04-28 10:00:00+00");
        seedBookmarkWithCreatedAt(newPost, alice.getId(), "2026-04-27 10:00:00+00");

        PostListResponse resp = engagementService.listBookmarks(alice.getId(), 1, 20, "req-4");
        // The "old post bookmarked today" must appear FIRST.
        assertThat(resp.data().get(0).id()).isEqualTo(oldPost);
        assertThat(resp.data().get(1).id()).isEqualTo(newPost);
    }

    @Test
    void listBookmarks_mutedAuthor_excluded() {
        UUID bobsPost = seedPost(bob.getId(), "public", false);
        seedBookmark(bobsPost, alice.getId());

        PostListResponse before = engagementService.listBookmarks(alice.getId(), 1, 20, "req-5");
        assertThat(before.data()).extracting(PostDto::id).contains(bobsPost);

        muteRepository.saveAndFlush(new UserMute(alice.getId(), bob.getId()));
        PostListResponse after = engagementService.listBookmarks(alice.getId(), 1, 20, "req-6");
        assertThat(after.data()).extracting(PostDto::id).doesNotContain(bobsPost);
    }

    @Test
    void listBookmarks_emptyResultMeta_isClean() {
        PostListResponse resp = engagementService.listBookmarks(alice.getId(), 1, 20, "req-7");
        assertThat(resp.data()).isEmpty();
        assertThat(resp.meta().totalCount()).isZero();
        assertThat(resp.meta().totalPages()).isZero();
        assertThat(resp.meta().hasNextPage()).isFalse();
        assertThat(resp.meta().hasPrevPage()).isFalse();
        assertThat(resp.meta().requestId()).isEqualTo("req-7");
    }
}
