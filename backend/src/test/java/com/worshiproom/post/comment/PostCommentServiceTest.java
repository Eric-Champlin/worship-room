package com.worshiproom.post.comment;

import com.worshiproom.post.PostNotFoundException;
import com.worshiproom.post.PostRepository;
import com.worshiproom.post.comment.dto.CommentDto;
import com.worshiproom.post.comment.dto.CommentListResponse;
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
 * Integration tests for {@link PostCommentService} — exercises the full
 * service stack against Testcontainers PostgreSQL.
 */
class PostCommentServiceTest extends AbstractIntegrationTest {

    @Autowired private PostCommentService postCommentService;
    @Autowired private PostRepository postRepository;
    @Autowired private UserRepository userRepository;
    @Autowired private JdbcTemplate jdbc;

    private User alice;
    private User bob;

    @BeforeEach
    void seed() {
        postRepository.deleteAll();
        userRepository.deleteAll();
        alice = userRepository.saveAndFlush(new User(
                "alice-svc-" + UUID.randomUUID().toString().substring(0, 8) + "@test.local",
                "$2a$10$x", "Alice", "Anderson", "UTC"));
        bob = userRepository.saveAndFlush(new User(
                "bob-svc-" + UUID.randomUUID().toString().substring(0, 8) + "@test.local",
                "$2a$10$x", "Bob", "Bennett", "UTC"));
    }

    private UUID seedPublicPost(UUID userId) {
        UUID id = UUID.randomUUID();
        jdbc.update("""
                INSERT INTO posts (id, user_id, post_type, content, visibility, moderation_status)
                VALUES (?, ?, 'prayer_request', 'svc test', 'public', 'approved')
                """, id, userId);
        return id;
    }

    private UUID seedPrivatePost(UUID userId) {
        UUID id = UUID.randomUUID();
        jdbc.update("""
                INSERT INTO posts (id, user_id, post_type, content, visibility, moderation_status)
                VALUES (?, ?, 'prayer_request', 'svc private', 'private', 'approved')
                """, id, userId);
        return id;
    }

    private UUID seedComment(UUID postId, UUID userId, String content,
                             UUID parentCommentId, boolean isDeleted, String moderationStatus) {
        UUID id = UUID.randomUUID();
        jdbc.update("""
                INSERT INTO post_comments (id, post_id, user_id, parent_comment_id, content,
                                           is_deleted, deleted_at, moderation_status)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                """,
                id, postId, userId, parentCommentId, content,
                isDeleted, isDeleted ? OffsetDateTime.now() : null, moderationStatus);
        return id;
    }

    private UUID seedCommentWithCreatedAt(UUID postId, UUID userId, String content,
                                          UUID parentCommentId, String createdAtIsoLike) {
        UUID id = UUID.randomUUID();
        // Use a literal TIMESTAMP WITH TIME ZONE to control sort.
        jdbc.update("""
                INSERT INTO post_comments (id, post_id, user_id, parent_comment_id, content,
                                           created_at, updated_at)
                VALUES (?, ?, ?, ?, ?, ?::timestamptz, ?::timestamptz)
                """,
                id, postId, userId, parentCommentId, content, createdAtIsoLike, createdAtIsoLike);
        return id;
    }

    @Test
    void listForPost_postNotVisible_throwsPostNotFoundException() {
        UUID alicesPrivate = seedPrivatePost(alice.getId());
        assertThatThrownBy(() -> postCommentService.listForPost(
                alicesPrivate, bob.getId(), 1, 20, "req-1"))
                .isInstanceOf(PostNotFoundException.class);
    }

    @Test
    void listForPost_postVisibleNoComments_returnsEmptyData() {
        UUID postId = seedPublicPost(alice.getId());
        CommentListResponse resp = postCommentService.listForPost(postId, null, 1, 20, "req-2");
        assertThat(resp.data()).isEmpty();
        assertThat(resp.meta().totalCount()).isEqualTo(0L);
        assertThat(resp.meta().totalPages()).isEqualTo(0);
        assertThat(resp.meta().hasNextPage()).isFalse();
        assertThat(resp.meta().hasPrevPage()).isFalse();
    }

    @Test
    void listForPost_topLevelOnly_paginatesCorrectly() {
        UUID postId = seedPublicPost(alice.getId());
        for (int i = 0; i < 25; i++) {
            seedComment(postId, alice.getId(), "comment " + i, null, false, "approved");
        }
        CommentListResponse page1 = postCommentService.listForPost(postId, null, 1, 20, "req-3");
        assertThat(page1.data()).hasSize(20);
        assertThat(page1.meta().totalCount()).isEqualTo(25L);
        assertThat(page1.meta().totalPages()).isEqualTo(2);
        assertThat(page1.meta().hasNextPage()).isTrue();
        assertThat(page1.meta().hasPrevPage()).isFalse();

        CommentListResponse page2 = postCommentService.listForPost(postId, null, 2, 20, "req-4");
        assertThat(page2.data()).hasSize(5);
        assertThat(page2.meta().hasNextPage()).isFalse();
        assertThat(page2.meta().hasPrevPage()).isTrue();
    }

    @Test
    void listForPost_softDeletedComment_excluded() {
        UUID postId = seedPublicPost(alice.getId());
        seedComment(postId, alice.getId(), "live 1", null, false, "approved");
        seedComment(postId, alice.getId(), "live 2", null, false, "approved");
        seedComment(postId, alice.getId(), "deleted", null, true, "approved");

        CommentListResponse resp = postCommentService.listForPost(postId, null, 1, 20, "req-5");
        assertThat(resp.data()).hasSize(2);
        assertThat(resp.data()).allSatisfy(c ->
                assertThat(c.content()).isIn("live 1", "live 2"));
    }

    @Test
    void listForPost_hiddenStatus_excluded() {
        UUID postId = seedPublicPost(alice.getId());
        seedComment(postId, alice.getId(), "approved one", null, false, "approved");
        seedComment(postId, alice.getId(), "flagged one", null, false, "flagged");
        seedComment(postId, alice.getId(), "hidden one", null, false, "hidden");
        seedComment(postId, alice.getId(), "removed one", null, false, "removed");

        CommentListResponse resp = postCommentService.listForPost(postId, null, 1, 20, "req-6");
        assertThat(resp.data()).hasSize(2);
        assertThat(resp.data()).extracting(CommentDto::content)
                .containsExactlyInAnyOrder("approved one", "flagged one");
    }

    @Test
    void listForPost_repliesNestedUnderParents() {
        UUID postId = seedPublicPost(alice.getId());
        UUID parent1 = seedComment(postId, alice.getId(), "p1", null, false, "approved");
        UUID parent2 = seedComment(postId, alice.getId(), "p2", null, false, "approved");
        seedComment(postId, bob.getId(), "p1-r1", parent1, false, "approved");
        seedComment(postId, bob.getId(), "p1-r2", parent1, false, "approved");
        seedComment(postId, bob.getId(), "p2-r1", parent2, false, "approved");

        CommentListResponse resp = postCommentService.listForPost(postId, null, 1, 20, "req-7");
        assertThat(resp.data()).hasSize(2);
        CommentDto first = resp.data().stream().filter(c -> c.id().equals(parent1)).findFirst().orElseThrow();
        CommentDto second = resp.data().stream().filter(c -> c.id().equals(parent2)).findFirst().orElseThrow();
        assertThat(first.replies()).hasSize(2);
        assertThat(second.replies()).hasSize(1);
    }

    @Test
    void listForPost_repliesAreEmptyArrayWhenNoChildren() {
        UUID postId = seedPublicPost(alice.getId());
        seedComment(postId, alice.getId(), "lonely top-level", null, false, "approved");
        CommentListResponse resp = postCommentService.listForPost(postId, null, 1, 20, "req-8");
        assertThat(resp.data()).hasSize(1);
        assertThat(resp.data().get(0).replies()).isNotNull().isEmpty();
    }

    @Test
    void listForPost_sortAscByCreatedAt() {
        UUID postId = seedPublicPost(alice.getId());
        UUID youngest = seedCommentWithCreatedAt(postId, alice.getId(), "youngest",
                null, "2026-01-15 10:00:00+00");
        UUID middle = seedCommentWithCreatedAt(postId, alice.getId(), "middle",
                null, "2026-01-14 10:00:00+00");
        UUID oldest = seedCommentWithCreatedAt(postId, alice.getId(), "oldest",
                null, "2026-01-13 10:00:00+00");

        CommentListResponse resp = postCommentService.listForPost(postId, null, 1, 20, "req-9");
        assertThat(resp.data()).extracting(CommentDto::id)
                .containsExactly(oldest, middle, youngest);
    }

    @Test
    void listForPost_authorAlwaysResolved_neverAnonymous() {
        UUID postId = seedPublicPost(alice.getId());
        seedComment(postId, bob.getId(), "by bob", null, false, "approved");
        CommentListResponse resp = postCommentService.listForPost(postId, null, 1, 20, "req-10");
        assertThat(resp.data()).hasSize(1);
        CommentDto c = resp.data().get(0);
        assertThat(c.author().id()).isEqualTo(bob.getId());
        assertThat(c.author().displayName()).isNotNull().isNotEqualTo("Anonymous");
    }

    @Test
    void listForPost_allRequestIdAndPageEchoed() {
        UUID postId = seedPublicPost(alice.getId());
        CommentListResponse resp = postCommentService.listForPost(postId, null, 1, 20, "abc-123");
        assertThat(resp.meta().requestId()).isEqualTo("abc-123");
        assertThat(resp.meta().page()).isEqualTo(1);
        assertThat(resp.meta().limit()).isEqualTo(20);
    }

    @Test
    void listForPost_authenticatedViewerCanSeeOwnPrivatePost() {
        UUID alicesPrivate = seedPrivatePost(alice.getId());
        seedComment(alicesPrivate, alice.getId(), "her own comment", null, false, "approved");
        CommentListResponse resp = postCommentService.listForPost(
                alicesPrivate, alice.getId(), 1, 20, "req-own");
        assertThat(resp.data()).hasSize(1);
    }
}
