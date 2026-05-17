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
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/**
 * Integration tests for PostService: pagination math, sort behavior, and
 * kebab-case author resolution at the service layer.
 */
class PostServiceTest extends AbstractIntegrationTest {

    @Autowired private PostService postService;
    @Autowired private PostRepository postRepository;
    @Autowired private UserRepository userRepository;
    @Autowired private JdbcTemplate jdbc;

    private User author;

    @BeforeEach
    void clean() {
        // Spec 7.6 — also clean dependency rows that may reference posts before
        // postRepository.deleteAll() runs.
        jdbc.update("DELETE FROM quick_lift_sessions");
        jdbc.update("DELETE FROM user_mutes");
        jdbc.update("DELETE FROM friend_relationships");
        postRepository.deleteAll();
        author = userRepository.saveAndFlush(new User(
                "svc-author-" + UUID.randomUUID().toString().substring(0, 8) + "@test.local",
                "$2a$10$placeholderplaceholderplaceholderplaceholderplaceholder",
                "Svc", "Author", "UTC"));
    }

    // ── Spec 7.6 — shared helpers for friend-pin tests ───────────────────────

    private User seedExtraUser(String tag) {
        return userRepository.saveAndFlush(new User(
                tag + "-" + UUID.randomUUID().toString().substring(0, 8) + "@test.local",
                "$2a$10$placeholderplaceholderplaceholderplaceholderplaceholder",
                tag.substring(0, 1).toUpperCase() + tag.substring(1), "Test", "UTC"));
    }

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

    private UUID seedPostWithTimes(UUID authorId, String visibility, String moderation,
                                   OffsetDateTime createdAt) {
        UUID id = UUID.randomUUID();
        jdbc.update("""
                INSERT INTO posts (id, user_id, post_type, content, visibility, moderation_status,
                                   created_at, updated_at, last_activity_at)
                VALUES (?, ?, 'prayer_request', 'spec76 test', ?, ?,
                        ?, ?, ?)
                """, id, authorId, visibility, moderation, createdAt, createdAt, createdAt);
        return id;
    }

    private UUID seedFreshFriendPost(UUID friendId) {
        return seedPostWithTimes(friendId, "public", "approved",
                OffsetDateTime.now(ZoneOffset.UTC).minusMinutes(5));
    }

    private void seedCompletedQuickLift(UUID userId, UUID postId) {
        OffsetDateTime started = OffsetDateTime.now(ZoneOffset.UTC).minusSeconds(60);
        jdbc.update("""
                INSERT INTO quick_lift_sessions (id, user_id, post_id, started_at, completed_at)
                VALUES (?, ?, ?, ?, ?)
                """, UUID.randomUUID(), userId, postId, started, started.plusSeconds(31));
    }

    private void seedMute(UUID muterId, UUID mutedId) {
        jdbc.update("INSERT INTO user_mutes (muter_id, muted_id) VALUES (?, ?)", muterId, mutedId);
    }

    private void seedPublicPosts(int count) {
        for (int i = 0; i < count; i++) {
            jdbc.update("""
                    INSERT INTO posts (id, user_id, post_type, content, visibility, moderation_status)
                    VALUES (?, ?, 'prayer_request', ?, 'public', 'approved')
                    """,
                    UUID.randomUUID(), author.getId(), "post " + i);
        }
    }

    @Test
    void listFeed_pagination_pageOneOfTwo_hasNextTrue_hasPrevFalse() {
        seedPublicPosts(25);
        PostListResponse resp = postService.listFeed(
                null, 1, 20, null, null, null, PostService.SortKey.BUMPED, "req-1");
        assertThat(resp.data()).hasSize(20);
        assertThat(resp.meta().totalCount()).isEqualTo(25L);
        assertThat(resp.meta().totalPages()).isEqualTo(2);
        assertThat(resp.meta().hasNextPage()).isTrue();
        assertThat(resp.meta().hasPrevPage()).isFalse();
    }

    @Test
    void listFeed_pagination_pageTwoOfTwo_hasNextFalse_hasPrevTrue() {
        seedPublicPosts(25);
        PostListResponse resp = postService.listFeed(
                null, 2, 20, null, null, null, PostService.SortKey.BUMPED, "req-2");
        assertThat(resp.data()).hasSize(5);
        assertThat(resp.meta().totalCount()).isEqualTo(25L);
        assertThat(resp.meta().totalPages()).isEqualTo(2);
        assertThat(resp.meta().hasNextPage()).isFalse();
        assertThat(resp.meta().hasPrevPage()).isTrue();
    }

    @Test
    void listFeed_pagination_zeroResults_hasNextAndPrevFalse() {
        // No posts seeded
        PostListResponse resp = postService.listFeed(
                null, 1, 20, null, null, null, PostService.SortKey.BUMPED, "req-3");
        assertThat(resp.data()).isEmpty();
        assertThat(resp.meta().totalCount()).isEqualTo(0L);
        assertThat(resp.meta().totalPages()).isEqualTo(0);
        assertThat(resp.meta().hasNextPage()).isFalse();
        assertThat(resp.meta().hasPrevPage()).isFalse();
    }

    @Test
    void listFeed_sort_recent_ordersByCreatedAtDesc() {
        // Seed three posts with explicit, distinct created_at values
        UUID p1 = UUID.randomUUID();
        UUID p2 = UUID.randomUUID();
        UUID p3 = UUID.randomUUID();
        jdbc.update("""
                INSERT INTO posts (id, user_id, post_type, content, visibility, moderation_status,
                                   created_at, updated_at, last_activity_at)
                VALUES (?, ?, 'prayer_request', 'oldest', 'public', 'approved',
                        TIMESTAMP WITH TIME ZONE '2026-01-01 00:00:00+00',
                        TIMESTAMP WITH TIME ZONE '2026-01-01 00:00:00+00',
                        TIMESTAMP WITH TIME ZONE '2026-01-01 00:00:00+00')
                """, p1, author.getId());
        jdbc.update("""
                INSERT INTO posts (id, user_id, post_type, content, visibility, moderation_status,
                                   created_at, updated_at, last_activity_at)
                VALUES (?, ?, 'prayer_request', 'middle', 'public', 'approved',
                        TIMESTAMP WITH TIME ZONE '2026-02-01 00:00:00+00',
                        TIMESTAMP WITH TIME ZONE '2026-02-01 00:00:00+00',
                        TIMESTAMP WITH TIME ZONE '2026-02-01 00:00:00+00')
                """, p2, author.getId());
        jdbc.update("""
                INSERT INTO posts (id, user_id, post_type, content, visibility, moderation_status,
                                   created_at, updated_at, last_activity_at)
                VALUES (?, ?, 'prayer_request', 'newest', 'public', 'approved',
                        TIMESTAMP WITH TIME ZONE '2026-03-01 00:00:00+00',
                        TIMESTAMP WITH TIME ZONE '2026-03-01 00:00:00+00',
                        TIMESTAMP WITH TIME ZONE '2026-03-01 00:00:00+00')
                """, p3, author.getId());

        PostListResponse resp = postService.listFeed(
                null, 1, 20, null, null, null, PostService.SortKey.RECENT, "req");
        assertThat(resp.data()).extracting(PostDto::id).containsExactly(p3, p2, p1);
    }

    @Test
    void listFeed_sort_bumped_ordersByLastActivityDesc() {
        UUID stale = UUID.randomUUID();
        UUID fresh = UUID.randomUUID();
        // stale: created later but bumped (last_activity_at) earlier
        jdbc.update("""
                INSERT INTO posts (id, user_id, post_type, content, visibility, moderation_status,
                                   created_at, updated_at, last_activity_at)
                VALUES (?, ?, 'prayer_request', 'stale', 'public', 'approved',
                        TIMESTAMP WITH TIME ZONE '2026-03-01 00:00:00+00',
                        TIMESTAMP WITH TIME ZONE '2026-03-01 00:00:00+00',
                        TIMESTAMP WITH TIME ZONE '2026-01-15 00:00:00+00')
                """, stale, author.getId());
        jdbc.update("""
                INSERT INTO posts (id, user_id, post_type, content, visibility, moderation_status,
                                   created_at, updated_at, last_activity_at)
                VALUES (?, ?, 'prayer_request', 'fresh', 'public', 'approved',
                        TIMESTAMP WITH TIME ZONE '2026-01-01 00:00:00+00',
                        TIMESTAMP WITH TIME ZONE '2026-01-01 00:00:00+00',
                        TIMESTAMP WITH TIME ZONE '2026-04-01 00:00:00+00')
                """, fresh, author.getId());

        PostListResponse resp = postService.listFeed(
                null, 1, 20, null, null, null, PostService.SortKey.BUMPED, "req");
        // fresh has the more recent last_activity_at and should come first
        assertThat(resp.data()).extracting(PostDto::id).containsExactly(fresh, stale);
    }

    @Test
    void listFeed_sort_answered_filtersToAnsweredAndOrdersByAnsweredAt() {
        UUID unanswered = UUID.randomUUID();
        UUID firstAnswered = UUID.randomUUID();
        UUID lastAnswered = UUID.randomUUID();

        jdbc.update("""
                INSERT INTO posts (id, user_id, post_type, content, visibility, moderation_status, is_answered)
                VALUES (?, ?, 'question', 'still asking', 'public', 'approved', false)
                """, unanswered, author.getId());
        jdbc.update("""
                INSERT INTO posts (id, user_id, post_type, content, visibility, moderation_status,
                                   is_answered, answered_at, answered_text)
                VALUES (?, ?, 'question', 'q1', 'public', 'approved',
                        true,
                        TIMESTAMP WITH TIME ZONE '2026-01-15 00:00:00+00',
                        'a1')
                """, firstAnswered, author.getId());
        jdbc.update("""
                INSERT INTO posts (id, user_id, post_type, content, visibility, moderation_status,
                                   is_answered, answered_at, answered_text)
                VALUES (?, ?, 'question', 'q2', 'public', 'approved',
                        true,
                        TIMESTAMP WITH TIME ZONE '2026-04-01 00:00:00+00',
                        'a2')
                """, lastAnswered, author.getId());

        PostListResponse resp = postService.listFeed(
                null, 1, 20, null, null, null, PostService.SortKey.ANSWERED, "req");
        assertThat(resp.data()).extracting(PostDto::id)
                .doesNotContain(unanswered)
                .containsExactly(lastAnswered, firstAnswered);
    }

    @Test
    void sortKey_parse_invalid_throwsInvalidSortException() {
        assertThatThrownBy(() -> PostService.SortKey.parse("foo", PostService.SortKey.BUMPED))
                .isInstanceOf(InvalidSortException.class)
                .hasMessageContaining("foo");
    }

    @Test
    void listFeed_qotdIdFilter_returnsOnlyMatchingPosts() {
        // Seed three posts: one matching qotd-1, one matching qotd-2, one with no qotd_id.
        // Verifies byQotdId stays in the Specification chain and uses exact equality
        // (the NULL row must not match 'qotd-1' under SQL three-valued logic).
        UUID match = UUID.randomUUID();
        UUID otherQotd = UUID.randomUUID();
        UUID noQotd = UUID.randomUUID();
        jdbc.update("""
                INSERT INTO posts (id, user_id, post_type, content, visibility, moderation_status, qotd_id)
                VALUES (?, ?, 'prayer_request', 'matches', 'public', 'approved', 'qotd-1')
                """, match, author.getId());
        jdbc.update("""
                INSERT INTO posts (id, user_id, post_type, content, visibility, moderation_status, qotd_id)
                VALUES (?, ?, 'prayer_request', 'different qotd', 'public', 'approved', 'qotd-2')
                """, otherQotd, author.getId());
        jdbc.update("""
                INSERT INTO posts (id, user_id, post_type, content, visibility, moderation_status)
                VALUES (?, ?, 'prayer_request', 'no qotd', 'public', 'approved')
                """, noQotd, author.getId());

        PostListResponse resp = postService.listFeed(
                null, 1, 20, null, null, "qotd-1", PostService.SortKey.RECENT, "req");

        assertThat(resp.data()).extracting(PostDto::id).containsExactly(match);
        assertThat(resp.meta().totalCount()).isEqualTo(1L);
    }

    @Test
    void listFeed_categoryAndPostType_compose_withAndIntersection() {
        // Seed four posts spanning the (category, postType) cross product. Each non-match
        // is excluded by a DIFFERENT axis, so dropping either filter from the chain would
        // change the result count in a different direction — strong defense against
        // accidental Specification.and() removal during refactor.
        UUID intersect = UUID.randomUUID();
        UUID wrongType = UUID.randomUUID();
        UUID wrongCategory = UUID.randomUUID();
        UUID neither = UUID.randomUUID();
        jdbc.update("""
                INSERT INTO posts (id, user_id, post_type, content, category, visibility, moderation_status)
                VALUES (?, ?, 'prayer_request', 'a', 'health', 'public', 'approved')
                """, intersect, author.getId());
        jdbc.update("""
                INSERT INTO posts (id, user_id, post_type, content, category, visibility, moderation_status)
                VALUES (?, ?, 'testimony', 'b', 'health', 'public', 'approved')
                """, wrongType, author.getId());
        jdbc.update("""
                INSERT INTO posts (id, user_id, post_type, content, category, visibility, moderation_status)
                VALUES (?, ?, 'prayer_request', 'c', 'family', 'public', 'approved')
                """, wrongCategory, author.getId());
        jdbc.update("""
                INSERT INTO posts (id, user_id, post_type, content, category, visibility, moderation_status)
                VALUES (?, ?, 'discussion', 'd', 'other', 'public', 'approved')
                """, neither, author.getId());

        PostListResponse resp = postService.listFeed(
                null, 1, 20, "health", PostType.PRAYER_REQUEST, null,
                PostService.SortKey.RECENT, "req");

        assertThat(resp.data()).extracting(PostDto::id).containsExactly(intersect);
        assertThat(resp.meta().totalCount()).isEqualTo(1L);
    }

    @Test
    void listAuthorPosts_unknownUsername_returnsEmptyArray() {
        PostListResponse resp = postService.listAuthorPosts(
                "nobody-here", null, 1, 20, PostService.SortKey.RECENT, "req");
        assertThat(resp.data()).isEmpty();
        assertThat(resp.meta().totalCount()).isEqualTo(0L);
        assertThat(resp.meta().totalPages()).isEqualTo(0);
        assertThat(resp.meta().hasNextPage()).isFalse();
        assertThat(resp.meta().hasPrevPage()).isFalse();
    }

    // =====================================================================
    // Spec 4.6 — encouragement 24h feed expiry
    // =====================================================================

    @Test
    void listFeed_excludesEncouragementsOlderThan24Hours() {
        UUID oldEnc = UUID.randomUUID();
        UUID recentEnc = UUID.randomUUID();
        UUID oldPrayer = UUID.randomUUID();
        jdbc.update("""
                INSERT INTO posts (id, user_id, post_type, content, category, visibility, moderation_status, created_at)
                VALUES (?, ?, 'encouragement', 'old enc', 'other', 'public', 'approved', ?)
                """, oldEnc, author.getId(), OffsetDateTime.now().minusHours(25));
        jdbc.update("""
                INSERT INTO posts (id, user_id, post_type, content, category, visibility, moderation_status, created_at)
                VALUES (?, ?, 'encouragement', 'recent enc', 'other', 'public', 'approved', ?)
                """, recentEnc, author.getId(), OffsetDateTime.now().minusHours(1));
        jdbc.update("""
                INSERT INTO posts (id, user_id, post_type, content, category, visibility, moderation_status, created_at)
                VALUES (?, ?, 'prayer_request', 'old prayer', 'family', 'public', 'approved', ?)
                """, oldPrayer, author.getId(), OffsetDateTime.now().minusHours(25));

        PostListResponse resp = postService.listFeed(
                null, 1, 50, null, null, null, PostService.SortKey.RECENT, "req");

        assertThat(resp.data()).extracting(PostDto::id)
                .contains(recentEnc, oldPrayer)  // recent encouragement + old prayer_request both pass
                .doesNotContain(oldEnc);          // old encouragement filtered out
    }

    @Test
    void getById_returnsExpiredEncouragement_byDirectIdLookup() {
        // D17 — direct ID lookup bypasses notExpired() so bookmarks and shared URLs
        // continue to resolve even after the 24h feed-window has passed.
        UUID expiredEnc = UUID.randomUUID();
        jdbc.update("""
                INSERT INTO posts (id, user_id, post_type, content, category, visibility, moderation_status, created_at)
                VALUES (?, ?, 'encouragement', 'old encouragement', 'other', 'public', 'approved', ?)
                """, expiredEnc, author.getId(), OffsetDateTime.now().minusHours(48));

        PostDto dto = postService.getById(expiredEnc, null);

        assertThat(dto.id()).isEqualTo(expiredEnc);
        assertThat(dto.postType()).isEqualTo("encouragement");
    }

    // ═════════════════════════════════════════════════════════════════════════
    // Spec 7.6 — Friend pin behavior on listFeed
    // ═════════════════════════════════════════════════════════════════════════

    @Test
    void listFeed_authenticatedWithFriends_pinsFriendPostsAtTop() {
        User viewer = seedExtraUser("viewer");
        User friend = seedExtraUser("friend");
        seedFriendship(friend.getId(), viewer.getId());
        // Seed a friend post 5min ago + 5 stranger (author) posts. Friend post
        // should pin at position 0.
        UUID friendPostId = seedFreshFriendPost(friend.getId());
        for (int i = 0; i < 5; i++) {
            seedPostWithTimes(author.getId(), "public", "approved",
                    OffsetDateTime.now(ZoneOffset.UTC).minusHours(i + 1));
        }

        PostListResponse resp = postService.listFeed(
                viewer.getId(), 1, 20, null, null, null, PostService.SortKey.BUMPED, "req");

        assertThat(resp.data()).isNotEmpty();
        assertThat(resp.data().get(0).id()).isEqualTo(friendPostId);
        assertThat(resp.data().get(0).isFromFriend()).isTrue();
        // Positions 1+ are stranger posts with isFromFriend=false.
        for (int i = 1; i < resp.data().size(); i++) {
            assertThat(resp.data().get(i).isFromFriend()).isFalse();
        }
    }

    @Test
    void listFeed_pinsAtMostThreeFriendPosts() {
        // Gate-G-MAX-THREE-PINS
        User viewer = seedExtraUser("viewer");
        User friend = seedExtraUser("friend");
        seedFriendship(friend.getId(), viewer.getId());
        OffsetDateTime base = OffsetDateTime.now(ZoneOffset.UTC).minusHours(1);
        // 5 friend posts at distinct ages — only top 3 most-recent should pin.
        for (int i = 0; i < 5; i++) {
            seedPostWithTimes(friend.getId(), "public", "approved", base.minusMinutes(i * 5));
        }
        // 5 stranger posts to fill the chronological remainder.
        for (int i = 0; i < 5; i++) {
            seedPostWithTimes(author.getId(), "public", "approved",
                    OffsetDateTime.now(ZoneOffset.UTC).minusHours(i + 2));
        }

        PostListResponse resp = postService.listFeed(
                viewer.getId(), 1, 20, null, null, null, PostService.SortKey.BUMPED, "req");

        // First 3 are friend pins; positions 3+ are not.
        assertThat(resp.data()).hasSizeGreaterThanOrEqualTo(3);
        assertThat(resp.data().subList(0, 3)).allMatch(PostDto::isFromFriend);
        for (int i = 3; i < resp.data().size(); i++) {
            assertThat(resp.data().get(i).isFromFriend()).isFalse();
        }
    }

    @Test
    void listFeed_noDuplicationOfPinnedPostsInRemainder() {
        // Gate-G-NO-DUPLICATION
        User viewer = seedExtraUser("viewer");
        User friend = seedExtraUser("friend");
        seedFriendship(friend.getId(), viewer.getId());
        OffsetDateTime base = OffsetDateTime.now(ZoneOffset.UTC).minusMinutes(30);
        for (int i = 0; i < 3; i++) {
            seedPostWithTimes(friend.getId(), "public", "approved", base.minusMinutes(i));
        }
        for (int i = 0; i < 10; i++) {
            seedPostWithTimes(author.getId(), "public", "approved", base.minusHours(i + 2));
        }

        PostListResponse resp = postService.listFeed(
                viewer.getId(), 1, 20, null, null, null, PostService.SortKey.BUMPED, "req");

        // Exactly 3 posts have isFromFriend=true.
        long pinCount = resp.data().stream().filter(PostDto::isFromFriend).count();
        assertThat(pinCount).isEqualTo(3L);
        // No friend post appears in the chronological remainder (positions 3+).
        for (int i = 3; i < resp.data().size(); i++) {
            assertThat(resp.data().get(i).isFromFriend()).isFalse();
        }
    }

    @Test
    void listFeed_authenticatedNoFriends_noPinning() {
        // Gate-G-EMPTY-FRIENDS-NO-PINS
        User viewer = seedExtraUser("viewer");
        // No friend_relationships seeded.
        for (int i = 0; i < 5; i++) {
            seedPostWithTimes(author.getId(), "public", "approved",
                    OffsetDateTime.now(ZoneOffset.UTC).minusHours(i + 1));
        }

        PostListResponse resp = postService.listFeed(
                viewer.getId(), 1, 20, null, null, null, PostService.SortKey.BUMPED, "req");

        assertThat(resp.data()).hasSizeGreaterThanOrEqualTo(5);
        assertThat(resp.data()).allMatch(d -> !d.isFromFriend());
    }

    @Test
    void listFeed_unauthenticated_noPinning() {
        // Gate-G-UNAUTHENTICATED-NO-PINS
        for (int i = 0; i < 5; i++) {
            seedPostWithTimes(author.getId(), "public", "approved",
                    OffsetDateTime.now(ZoneOffset.UTC).minusHours(i + 1));
        }

        PostListResponse resp = postService.listFeed(
                null, 1, 20, null, null, null, PostService.SortKey.BUMPED, "req");

        assertThat(resp.data()).hasSizeGreaterThanOrEqualTo(5);
        assertThat(resp.data()).allMatch(d -> !d.isFromFriend());
    }

    @Test
    void listFeed_excludesFriendPostsOlderThan24h() {
        // Gate-G-24-HOUR-WINDOW
        User viewer = seedExtraUser("viewer");
        User friend = seedExtraUser("friend");
        seedFriendship(friend.getId(), viewer.getId());
        UUID stalePost = seedPostWithTimes(friend.getId(), "public", "approved",
                OffsetDateTime.now(ZoneOffset.UTC).minusHours(25));
        UUID freshPost = seedPostWithTimes(friend.getId(), "public", "approved",
                OffsetDateTime.now(ZoneOffset.UTC).minusMinutes(5));

        PostListResponse resp = postService.listFeed(
                viewer.getId(), 1, 20, null, null, null, PostService.SortKey.BUMPED, "req");

        PostDto freshDto = resp.data().stream()
                .filter(d -> d.id().equals(freshPost)).findFirst().orElseThrow();
        PostDto staleDto = resp.data().stream()
                .filter(d -> d.id().equals(stalePost)).findFirst().orElseThrow();
        assertThat(freshDto.isFromFriend()).isTrue();
        assertThat(staleDto.isFromFriend()).isFalse();
    }

    @Test
    void listFeed_doesNotPinSelfPosts() {
        // Gate-G-NO-SELF-PINNING — friend_relationships PK structurally forbids
        // self-rows, so byActiveFriendsOf(viewerId) cannot return the viewer's own posts.
        User viewer = seedExtraUser("viewer");
        User friend = seedExtraUser("friend");
        seedFriendship(friend.getId(), viewer.getId());
        UUID viewerOwnPost = seedPostWithTimes(viewer.getId(), "public", "approved",
                OffsetDateTime.now(ZoneOffset.UTC).minusMinutes(2));
        UUID friendPost = seedFreshFriendPost(friend.getId());

        PostListResponse resp = postService.listFeed(
                viewer.getId(), 1, 20, null, null, null, PostService.SortKey.BUMPED, "req");

        // Friend post is pinned at position 0.
        assertThat(resp.data().get(0).id()).isEqualTo(friendPost);
        assertThat(resp.data().get(0).isFromFriend()).isTrue();
        // Viewer's own post is present but not pinned.
        PostDto ownDto = resp.data().stream()
                .filter(d -> d.id().equals(viewerOwnPost)).findFirst().orElseThrow();
        assertThat(ownDto.isFromFriend()).isFalse();
    }

    @Test
    void listFeed_pinsRespectVisibility() {
        // Gate-G-VISIBILITY-RESPECTED
        User viewer = seedExtraUser("viewer");
        User friend = seedExtraUser("friend");
        seedFriendship(friend.getId(), viewer.getId());
        OffsetDateTime now = OffsetDateTime.now(ZoneOffset.UTC).minusMinutes(5);
        UUID privatePost = seedPostWithTimes(friend.getId(), "private", "approved", now);
        UUID friendsOnlyPost = seedPostWithTimes(friend.getId(), "friends", "approved", now.minusMinutes(1));
        UUID publicPost = seedPostWithTimes(friend.getId(), "public", "approved", now.minusMinutes(2));

        PostListResponse resp = postService.listFeed(
                viewer.getId(), 1, 20, null, null, null, PostService.SortKey.BUMPED, "req");

        List<UUID> pinnedIds = resp.data().stream()
                .filter(PostDto::isFromFriend)
                .map(PostDto::id).toList();
        assertThat(pinnedIds).contains(friendsOnlyPost, publicPost).doesNotContain(privatePost);
    }

    @Test
    void listFeed_pinsRespectModeration() {
        // Gate-G-MODERATION-RESPECTED — visibleTo() filters status to IN ('approved','flagged');
        // hidden/removed posts should NOT appear at all.
        User viewer = seedExtraUser("viewer");
        User friend = seedExtraUser("friend");
        seedFriendship(friend.getId(), viewer.getId());
        OffsetDateTime now = OffsetDateTime.now(ZoneOffset.UTC).minusMinutes(5);
        UUID approvedPost = seedPostWithTimes(friend.getId(), "public", "approved", now);
        UUID hiddenPost = seedPostWithTimes(friend.getId(), "public", "hidden", now.minusMinutes(1));

        PostListResponse resp = postService.listFeed(
                viewer.getId(), 1, 20, null, null, null, PostService.SortKey.BUMPED, "req");

        List<UUID> allIds = resp.data().stream().map(PostDto::id).toList();
        assertThat(allIds).contains(approvedPost).doesNotContain(hiddenPost);
    }

    @Test
    void listFeed_page2_noPinning() {
        // Gate-G-PAGE-1-ONLY-PINNING
        User viewer = seedExtraUser("viewer");
        User friend = seedExtraUser("friend");
        seedFriendship(friend.getId(), viewer.getId());
        OffsetDateTime base = OffsetDateTime.now(ZoneOffset.UTC).minusMinutes(10);
        for (int i = 0; i < 5; i++) {
            seedPostWithTimes(friend.getId(), "public", "approved", base.minusMinutes(i));
        }
        for (int i = 0; i < 30; i++) {
            seedPostWithTimes(author.getId(), "public", "approved",
                    OffsetDateTime.now(ZoneOffset.UTC).minusHours(i + 2));
        }

        PostListResponse resp = postService.listFeed(
                viewer.getId(), 2, 20, null, null, null, PostService.SortKey.BUMPED, "req");

        assertThat(resp.data()).allMatch(d -> !d.isFromFriend());
    }

    @Test
    void listFeed_answeredSort_noPinning() {
        // Spec 7.6 R6 — Answered branch is viewer-agnostic cached; no pins.
        User viewer = seedExtraUser("viewer");
        User friend = seedExtraUser("friend");
        seedFriendship(friend.getId(), viewer.getId());
        // Seed an answered friend post in the last 24h.
        UUID answeredId = UUID.randomUUID();
        OffsetDateTime now = OffsetDateTime.now(ZoneOffset.UTC).minusMinutes(5);
        jdbc.update("""
                INSERT INTO posts (id, user_id, post_type, content, visibility, moderation_status,
                                   is_answered, answered_at, answered_text,
                                   created_at, updated_at, last_activity_at)
                VALUES (?, ?, 'prayer_request', 'answered friend post', 'public', 'approved',
                        TRUE, ?, 'praise!', ?, ?, ?)
                """, answeredId, friend.getId(), now, now, now, now);

        PostListResponse resp = postService.listFeed(
                viewer.getId(), 1, 20, null, null, null, PostService.SortKey.ANSWERED, "req");

        assertThat(resp.data()).allMatch(d -> !d.isFromFriend());
    }

    @Test
    void listFeed_quickLiftedFriendPostStillPinned() {
        // Gate-G-NO-QUICK-LIFT-EXCLUSION
        User viewer = seedExtraUser("viewer");
        User friend = seedExtraUser("friend");
        seedFriendship(friend.getId(), viewer.getId());
        UUID friendPost = seedFreshFriendPost(friend.getId());
        seedCompletedQuickLift(viewer.getId(), friendPost);

        PostListResponse resp = postService.listFeed(
                viewer.getId(), 1, 20, null, null, null, PostService.SortKey.BUMPED, "req");

        assertThat(resp.data().get(0).id()).isEqualTo(friendPost);
        assertThat(resp.data().get(0).isFromFriend()).isTrue();
    }

    @Test
    void listFeed_blockedFriendNoPin() {
        // Gate-G-ACTIVE-RELATIONSHIPS-ONLY
        User viewer = seedExtraUser("viewer");
        User friend = seedExtraUser("friend");
        seedFriendshipWithStatus(friend.getId(), viewer.getId(), "blocked");
        UUID friendPost = seedFreshFriendPost(friend.getId());

        PostListResponse resp = postService.listFeed(
                viewer.getId(), 1, 20, null, null, null, PostService.SortKey.BUMPED, "req");

        PostDto dto = resp.data().stream()
                .filter(d -> d.id().equals(friendPost)).findFirst().orElseThrow();
        assertThat(dto.isFromFriend()).isFalse();
    }

    @Test
    void listFeed_pinsMutedFriendsExcluded() {
        // Muted friend's posts must not surface in the pin set.
        User viewer = seedExtraUser("viewer");
        User friend = seedExtraUser("friend");
        seedFriendship(friend.getId(), viewer.getId());
        seedMute(viewer.getId(), friend.getId());
        UUID friendPost = seedFreshFriendPost(friend.getId());

        PostListResponse resp = postService.listFeed(
                viewer.getId(), 1, 20, null, null, null, PostService.SortKey.BUMPED, "req");

        // Muted post is filtered out entirely by notMutedBy.
        List<UUID> allIds = resp.data().stream().map(PostDto::id).toList();
        assertThat(allIds).doesNotContain(friendPost);
    }

    @Test
    void listFeed_totalCountIncludesPins() {
        // Catches the totalElements math bug — total must be unioned, not just chronological.
        User viewer = seedExtraUser("viewer");
        User friend = seedExtraUser("friend");
        seedFriendship(friend.getId(), viewer.getId());
        OffsetDateTime base = OffsetDateTime.now(ZoneOffset.UTC).minusMinutes(10);
        for (int i = 0; i < 3; i++) {
            seedPostWithTimes(friend.getId(), "public", "approved", base.minusMinutes(i));
        }
        for (int i = 0; i < 20; i++) {
            seedPostWithTimes(author.getId(), "public", "approved",
                    OffsetDateTime.now(ZoneOffset.UTC).minusHours(i + 2));
        }
        // Total visible = 23 (3 friend + 20 stranger); page 1 with limit 20 — hasNext=true.

        PostListResponse resp = postService.listFeed(
                viewer.getId(), 1, 20, null, null, null, PostService.SortKey.BUMPED, "req");

        assertThat(resp.meta().totalCount()).isEqualTo(23L);
        assertThat(resp.meta().hasNextPage()).isTrue();
    }

    @Test
    void listFeed_chronologicalLimitAccountsForPins() {
        // Page 1, limit=20, 3 friend pins + 30 stranger posts:
        // Expected data.size() == 20 (3 pins + 17 chronological).
        User viewer = seedExtraUser("viewer");
        User friend = seedExtraUser("friend");
        seedFriendship(friend.getId(), viewer.getId());
        OffsetDateTime base = OffsetDateTime.now(ZoneOffset.UTC).minusMinutes(10);
        for (int i = 0; i < 3; i++) {
            seedPostWithTimes(friend.getId(), "public", "approved", base.minusMinutes(i));
        }
        for (int i = 0; i < 30; i++) {
            seedPostWithTimes(author.getId(), "public", "approved",
                    OffsetDateTime.now(ZoneOffset.UTC).minusHours(i + 2));
        }

        PostListResponse resp = postService.listFeed(
                viewer.getId(), 1, 20, null, null, null, PostService.SortKey.BUMPED, "req");

        assertThat(resp.data()).hasSize(20);
        long pinCount = resp.data().stream().filter(PostDto::isFromFriend).count();
        assertThat(pinCount).isEqualTo(3L);
    }

    // ── Spec 7.6 — boundary tests: limit ≤ FRIEND_PIN_LIMIT ──────────────────
    // Regression guards for the PageRequest.of(0, 0) crash that would occur
    // when chronologicalLimit = limit - pinIds.size() drops to zero or below.

    @Test
    void listFeed_limitOne_authenticatedWithFriends_returnsOnePinOnly() {
        // limit=1 with 3 eligible friend posts. Pin fetch is capped at
        // min(FRIEND_PIN_LIMIT, limit) = 1, so only the newest pin surfaces;
        // the other two friend posts roll into the chronological count without
        // appearing on page 1. chronologicalLimit = 0 → skip Page fetch, use count(spec).
        User viewer = seedExtraUser("viewer");
        User friend = seedExtraUser("friend");
        seedFriendship(friend.getId(), viewer.getId());
        OffsetDateTime base = OffsetDateTime.now(ZoneOffset.UTC).minusHours(1);
        seedPostWithTimes(friend.getId(), "public", "approved", base.minusMinutes(20)); // oldest
        seedPostWithTimes(friend.getId(), "public", "approved", base.minusMinutes(10)); // middle
        UUID newest = seedPostWithTimes(friend.getId(), "public", "approved", base);
        for (int i = 0; i < 5; i++) {
            seedPostWithTimes(author.getId(), "public", "approved",
                    OffsetDateTime.now(ZoneOffset.UTC).minusHours(i + 2));
        }

        PostListResponse resp = postService.listFeed(
                viewer.getId(), 1, 1, null, null, null, PostService.SortKey.BUMPED, "req");

        assertThat(resp.data()).hasSize(1);
        assertThat(resp.data().get(0).id()).isEqualTo(newest);
        assertThat(resp.data().get(0).isFromFriend()).isTrue();
        // 2 friend posts (oldest+middle) + 5 stranger + 1 pin = 8 total visible.
        assertThat(resp.meta().totalCount()).isEqualTo(8L);
        assertThat(resp.meta().hasNextPage()).isTrue();
    }

    @Test
    void listFeed_limitEqualsThreePins_returnsThreePinsZeroChronological() {
        // limit=3 with exactly 3 eligible friend posts. chronologicalLimit = 0 →
        // skip fetch, use count(spec). Asserts the no-crash path PLUS correct
        // totalElements when pins exactly fill the page.
        User viewer = seedExtraUser("viewer");
        User friend = seedExtraUser("friend");
        seedFriendship(friend.getId(), viewer.getId());
        OffsetDateTime base = OffsetDateTime.now(ZoneOffset.UTC).minusHours(1);
        for (int i = 0; i < 3; i++) {
            seedPostWithTimes(friend.getId(), "public", "approved", base.minusMinutes(i * 5));
        }
        for (int i = 0; i < 5; i++) {
            seedPostWithTimes(author.getId(), "public", "approved",
                    OffsetDateTime.now(ZoneOffset.UTC).minusHours(i + 2));
        }

        PostListResponse resp = postService.listFeed(
                viewer.getId(), 1, 3, null, null, null, PostService.SortKey.BUMPED, "req");

        assertThat(resp.data()).hasSize(3);
        assertThat(resp.data()).allMatch(PostDto::isFromFriend);
        // 3 pins + 5 stranger remainder = 8 total visible.
        assertThat(resp.meta().totalCount()).isEqualTo(8L);
        assertThat(resp.meta().hasNextPage()).isTrue();
    }

    @Test
    void listFeed_limitTwo_truncatesPinSetToTwo() {
        // limit=2 with 3 eligible friend posts. Pin fetch capped at min(3, 2) = 2.
        // The two newest pin; the oldest friend post is excluded from page 1
        // entirely (page 2+ would pick it up via normal chronological order).
        User viewer = seedExtraUser("viewer");
        User friend = seedExtraUser("friend");
        seedFriendship(friend.getId(), viewer.getId());
        OffsetDateTime base = OffsetDateTime.now(ZoneOffset.UTC).minusHours(1);
        seedPostWithTimes(friend.getId(), "public", "approved", base.minusMinutes(20)); // oldest
        UUID middle = seedPostWithTimes(friend.getId(), "public", "approved", base.minusMinutes(10));
        UUID newest = seedPostWithTimes(friend.getId(), "public", "approved", base);
        for (int i = 0; i < 5; i++) {
            seedPostWithTimes(author.getId(), "public", "approved",
                    OffsetDateTime.now(ZoneOffset.UTC).minusHours(i + 2));
        }

        PostListResponse resp = postService.listFeed(
                viewer.getId(), 1, 2, null, null, null, PostService.SortKey.BUMPED, "req");

        assertThat(resp.data()).hasSize(2);
        assertThat(resp.data().get(0).id()).isEqualTo(newest);
        assertThat(resp.data().get(0).isFromFriend()).isTrue();
        assertThat(resp.data().get(1).id()).isEqualTo(middle);
        assertThat(resp.data().get(1).isFromFriend()).isTrue();
    }
}
