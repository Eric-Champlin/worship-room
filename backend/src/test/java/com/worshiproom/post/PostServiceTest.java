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
        postRepository.deleteAll();
        author = userRepository.saveAndFlush(new User(
                "svc-author-" + UUID.randomUUID().toString().substring(0, 8) + "@test.local",
                "$2a$10$placeholderplaceholderplaceholderplaceholderplaceholder",
                "Svc", "Author", "UTC"));
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
}
