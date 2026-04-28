package com.worshiproom.post.comment;

import com.worshiproom.activity.ActivityService;
import com.worshiproom.auth.AuthenticatedUser;
import com.worshiproom.post.ModerationStatus;
import com.worshiproom.post.PostRepository;
import com.worshiproom.user.UserRepository;
import jakarta.persistence.EntityManager;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.context.ApplicationEventPublisher;

import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/**
 * Unit-level tests for {@link PostCommentService#deleteComment}. Mockito-only.
 * Covers ownership/admin gate, idempotent already-deleted handling, SQL counter
 * decrement, and the Spec D8 "403 over 404" rule for already-deleted-not-owned.
 */
@ExtendWith(MockitoExtension.class)
class PostCommentServiceDeleteTest {

    @Mock private PostRepository postRepository;
    @Mock private PostCommentRepository commentRepository;
    @Mock private PostCommentMapper commentMapper;
    @Mock private CommentsRateLimitService rateLimitService;
    @Mock private CommentsIdempotencyService idempotencyService;
    @Mock private ApplicationEventPublisher eventPublisher;
    @Mock private ActivityService activityService;
    @Mock private UserRepository userRepository;
    @Mock private EntityManager entityManager;

    private final CommentsRateLimitConfig config = new CommentsRateLimitConfig();
    private PostCommentService service;

    @BeforeEach
    void setUp() {
        org.owasp.html.PolicyFactory htmlSanitizerPolicy =
                org.owasp.html.Sanitizers.FORMATTING.and(org.owasp.html.Sanitizers.LINKS);
        service = new PostCommentService(
                postRepository, commentRepository, commentMapper,
                rateLimitService, idempotencyService, eventPublisher,
                activityService, userRepository, htmlSanitizerPolicy,
                config, entityManager);
    }

    private PostComment buildLiveComment(UUID id, UUID userId, UUID postId) {
        PostComment c = new PostComment();
        c.setId(id);
        c.setPostId(postId);
        c.setUserId(userId);
        c.setContent("content");
        c.setHelpful(false);
        c.setDeleted(false);
        c.setModerationStatus(ModerationStatus.APPROVED);
        c.setCrisisFlag(false);
        return c;
    }

    private PostComment buildDeletedComment(UUID id, UUID userId, UUID postId) {
        PostComment c = buildLiveComment(id, userId, postId);
        c.setDeleted(true);
        return c;
    }

    @Test
    void authorDeleteSucceedsAndDecrementsCounter() {
        UUID commentId = UUID.randomUUID();
        UUID authorId = UUID.randomUUID();
        UUID postId = UUID.randomUUID();
        AuthenticatedUser principal = new AuthenticatedUser(authorId, false);

        when(commentRepository.findByIdAndIsDeletedTrue(commentId)).thenReturn(Optional.empty());
        PostComment comment = buildLiveComment(commentId, authorId, postId);
        when(commentRepository.findByIdAndIsDeletedFalse(commentId)).thenReturn(Optional.of(comment));
        when(commentRepository.save(any(PostComment.class))).thenAnswer(inv -> inv.getArgument(0));

        service.deleteComment(commentId, principal, "rid");

        ArgumentCaptor<PostComment> captor = ArgumentCaptor.forClass(PostComment.class);
        verify(commentRepository).save(captor.capture());
        assertThat(captor.getValue().isDeleted()).isTrue();
        assertThat(captor.getValue().getDeletedAt()).isNotNull();

        verify(postRepository, times(1)).decrementCommentCount(postId);
    }

    @Test
    void adminCanDeleteAnyComment() {
        UUID commentId = UUID.randomUUID();
        UUID authorId = UUID.randomUUID();
        UUID adminId = UUID.randomUUID();
        UUID postId = UUID.randomUUID();
        AuthenticatedUser principal = new AuthenticatedUser(adminId, true);

        when(commentRepository.findByIdAndIsDeletedTrue(commentId)).thenReturn(Optional.empty());
        PostComment comment = buildLiveComment(commentId, authorId, postId);
        when(commentRepository.findByIdAndIsDeletedFalse(commentId)).thenReturn(Optional.of(comment));
        when(commentRepository.save(any(PostComment.class))).thenAnswer(inv -> inv.getArgument(0));

        service.deleteComment(commentId, principal, "rid");

        verify(commentRepository, times(1)).save(any(PostComment.class));
    }

    @Test
    void nonAuthorThrows403() {
        UUID commentId = UUID.randomUUID();
        UUID authorId = UUID.randomUUID();
        UUID otherUser = UUID.randomUUID();
        UUID postId = UUID.randomUUID();
        AuthenticatedUser principal = new AuthenticatedUser(otherUser, false);

        when(commentRepository.findByIdAndIsDeletedTrue(commentId)).thenReturn(Optional.empty());
        PostComment comment = buildLiveComment(commentId, authorId, postId);
        when(commentRepository.findByIdAndIsDeletedFalse(commentId)).thenReturn(Optional.of(comment));

        assertThatThrownBy(() -> service.deleteComment(commentId, principal, "rid"))
                .isInstanceOf(CommentForbiddenException.class);

        verify(commentRepository, never()).save(any(PostComment.class));
        verify(postRepository, never()).decrementCommentCount(any(UUID.class));
    }

    @Test
    void alreadyDeletedByAuthorReturnsIdempotent() {
        // Comment already soft-deleted, requester is author → returns void without throwing.
        UUID commentId = UUID.randomUUID();
        UUID authorId = UUID.randomUUID();
        UUID postId = UUID.randomUUID();
        AuthenticatedUser principal = new AuthenticatedUser(authorId, false);

        PostComment deleted = buildDeletedComment(commentId, authorId, postId);
        when(commentRepository.findByIdAndIsDeletedTrue(commentId)).thenReturn(Optional.of(deleted));

        service.deleteComment(commentId, principal, "rid");

        verify(commentRepository, never()).save(any(PostComment.class));
        verify(postRepository, never()).decrementCommentCount(any(UUID.class));
    }

    @Test
    void alreadyDeletedByNonAuthorThrows403() {
        // Spec D8 — 403 not 404 when non-author tries to delete an already-deleted comment.
        UUID commentId = UUID.randomUUID();
        UUID authorId = UUID.randomUUID();
        UUID otherUser = UUID.randomUUID();
        UUID postId = UUID.randomUUID();
        AuthenticatedUser principal = new AuthenticatedUser(otherUser, false);

        PostComment deleted = buildDeletedComment(commentId, authorId, postId);
        when(commentRepository.findByIdAndIsDeletedTrue(commentId)).thenReturn(Optional.of(deleted));

        assertThatThrownBy(() -> service.deleteComment(commentId, principal, "rid"))
                .isInstanceOf(CommentForbiddenException.class);
    }

    @Test
    void commentNotFoundThrows404() {
        UUID commentId = UUID.randomUUID();
        UUID authorId = UUID.randomUUID();
        AuthenticatedUser principal = new AuthenticatedUser(authorId, false);

        when(commentRepository.findByIdAndIsDeletedTrue(commentId)).thenReturn(Optional.empty());
        when(commentRepository.findByIdAndIsDeletedFalse(commentId)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.deleteComment(commentId, principal, "rid"))
                .isInstanceOf(PostCommentNotFoundException.class);
    }

    @Test
    void lastActivityAtNotBumpedOnDelete() {
        UUID commentId = UUID.randomUUID();
        UUID authorId = UUID.randomUUID();
        UUID postId = UUID.randomUUID();
        AuthenticatedUser principal = new AuthenticatedUser(authorId, false);

        when(commentRepository.findByIdAndIsDeletedTrue(commentId)).thenReturn(Optional.empty());
        PostComment comment = buildLiveComment(commentId, authorId, postId);
        when(commentRepository.findByIdAndIsDeletedFalse(commentId)).thenReturn(Optional.of(comment));
        when(commentRepository.save(any(PostComment.class))).thenAnswer(inv -> inv.getArgument(0));

        service.deleteComment(commentId, principal, "rid");

        verify(postRepository, never()).incrementCommentCountAndBumpLastActivity(any(UUID.class));
    }
}
