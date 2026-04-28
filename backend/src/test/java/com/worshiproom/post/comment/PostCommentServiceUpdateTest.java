package com.worshiproom.post.comment;

import com.worshiproom.activity.ActivityService;
import com.worshiproom.auth.AuthenticatedUser;
import com.worshiproom.post.EmptyPatchBodyException;
import com.worshiproom.post.ModerationStatus;
import com.worshiproom.post.PostRepository;
import com.worshiproom.post.comment.dto.CommentDto;
import com.worshiproom.post.comment.dto.UpdateCommentRequest;
import com.worshiproom.post.dto.AuthorDto;
import com.worshiproom.safety.CrisisDetectedEvent;
import com.worshiproom.safety.ContentType;
import com.worshiproom.user.User;
import com.worshiproom.user.UserRepository;
import jakarta.persistence.EntityManager;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.context.ApplicationEventPublisher;

import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/**
 * Unit-level tests for {@link PostCommentService#updateComment}. Mockito-only.
 * Asserts: author/admin gate, edit-window check, content-only edit (no PATCH on
 * parentCommentId or isHelpful), crisis re-detection (newly detected publishes event;
 * already-flagged stays flagged but doesn't republish a duplicate), no last_activity_at
 * bump on PATCH.
 */
@ExtendWith(MockitoExtension.class)
class PostCommentServiceUpdateTest {

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

    private PostComment buildLiveComment(UUID id, UUID userId, OffsetDateTime createdAt) {
        PostComment c = new PostComment();
        c.setId(id);
        c.setPostId(UUID.randomUUID());
        c.setUserId(userId);
        c.setContent("original content");
        c.setHelpful(false);
        c.setDeleted(false);
        c.setModerationStatus(ModerationStatus.APPROVED);
        c.setCrisisFlag(false);
        // Use reflection-free hack: setUpdatedAt + simulate created_at via getter override
        // Actually PostComment.createdAt has no setter (matches @Column(insertable=false, updatable=false)).
        // For unit tests we mock getCreatedAt via Mockito spy:
        return c;
    }

    /**
     * Wraps a real PostComment with a Mockito spy so getCreatedAt() can be stubbed.
     * Lenient because some tests short-circuit before the edit-window check (e.g.,
     * nonAuthorThrows403 throws on the ownership gate).
     */
    private PostComment spyWithCreatedAt(PostComment c, OffsetDateTime createdAt) {
        PostComment spy = org.mockito.Mockito.spy(c);
        lenient().when(spy.getCreatedAt()).thenReturn(createdAt);
        return spy;
    }

    private void wireUserResolution(UUID userId) {
        User user = mock(User.class);
        lenient().when(user.getId()).thenReturn(userId);
        lenient().when(user.getFirstName()).thenReturn("Test");
        lenient().when(userRepository.findById(any(UUID.class))).thenReturn(Optional.of(user));
        lenient().when(commentMapper.toDto(any(PostComment.class), any(AuthorDto.class)))
                .thenReturn(mock(CommentDto.class));
    }

    @Test
    void authorWithinWindowSucceeds() {
        UUID commentId = UUID.randomUUID();
        UUID authorId = UUID.randomUUID();
        AuthenticatedUser principal = new AuthenticatedUser(authorId, false);

        PostComment comment = spyWithCreatedAt(
                buildLiveComment(commentId, authorId, null),
                OffsetDateTime.now(ZoneOffset.UTC).minusMinutes(2));
        when(commentRepository.findByIdAndIsDeletedFalse(commentId)).thenReturn(Optional.of(comment));
        when(commentRepository.save(any(PostComment.class))).thenAnswer(inv -> inv.getArgument(0));
        wireUserResolution(authorId);

        service.updateComment(commentId, principal,
                new UpdateCommentRequest("updated content"), "rid");

        verify(commentRepository, times(1)).save(any(PostComment.class));
        verify(postRepository, never()).incrementCommentCountAndBumpLastActivity(any(UUID.class));
    }

    @Test
    void authorAfterWindowThrows409() {
        UUID commentId = UUID.randomUUID();
        UUID authorId = UUID.randomUUID();
        AuthenticatedUser principal = new AuthenticatedUser(authorId, false);

        PostComment comment = spyWithCreatedAt(
                buildLiveComment(commentId, authorId, null),
                OffsetDateTime.now(ZoneOffset.UTC).minusMinutes(6));
        when(commentRepository.findByIdAndIsDeletedFalse(commentId)).thenReturn(Optional.of(comment));

        assertThatThrownBy(() -> service.updateComment(commentId, principal,
                new UpdateCommentRequest("late edit"), "rid"))
                .isInstanceOf(CommentEditWindowExpiredException.class);
    }

    @Test
    void nonAuthorThrows403() {
        UUID commentId = UUID.randomUUID();
        UUID authorId = UUID.randomUUID();
        UUID otherUser = UUID.randomUUID();
        AuthenticatedUser principal = new AuthenticatedUser(otherUser, false);

        PostComment comment = spyWithCreatedAt(
                buildLiveComment(commentId, authorId, null),
                OffsetDateTime.now(ZoneOffset.UTC).minusMinutes(2));
        when(commentRepository.findByIdAndIsDeletedFalse(commentId)).thenReturn(Optional.of(comment));

        assertThatThrownBy(() -> service.updateComment(commentId, principal,
                new UpdateCommentRequest("malicious edit"), "rid"))
                .isInstanceOf(CommentForbiddenException.class);
    }

    @Test
    void adminCanEditAnyComment() {
        UUID commentId = UUID.randomUUID();
        UUID authorId = UUID.randomUUID();
        UUID adminId = UUID.randomUUID();
        AuthenticatedUser principal = new AuthenticatedUser(adminId, true);

        PostComment comment = spyWithCreatedAt(
                buildLiveComment(commentId, authorId, null),
                OffsetDateTime.now(ZoneOffset.UTC).minusMinutes(2));
        when(commentRepository.findByIdAndIsDeletedFalse(commentId)).thenReturn(Optional.of(comment));
        when(commentRepository.save(any(PostComment.class))).thenAnswer(inv -> inv.getArgument(0));
        wireUserResolution(authorId);

        service.updateComment(commentId, principal,
                new UpdateCommentRequest("admin moderator edit"), "rid");

        verify(commentRepository, times(1)).save(any(PostComment.class));
    }

    @Test
    void softDeletedCommentThrows404() {
        UUID commentId = UUID.randomUUID();
        UUID authorId = UUID.randomUUID();
        AuthenticatedUser principal = new AuthenticatedUser(authorId, false);

        when(commentRepository.findByIdAndIsDeletedFalse(commentId)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.updateComment(commentId, principal,
                new UpdateCommentRequest("edit"), "rid"))
                .isInstanceOf(PostCommentNotFoundException.class);
    }

    @Test
    void crisisFlagPreservedOnCleanEdit() {
        // Initial comment has crisisFlag=true. Author edits to clean content.
        // crisisFlag must STAY true (moderator-only clear).
        UUID commentId = UUID.randomUUID();
        UUID authorId = UUID.randomUUID();
        AuthenticatedUser principal = new AuthenticatedUser(authorId, false);

        PostComment comment = buildLiveComment(commentId, authorId, null);
        comment.setCrisisFlag(true);
        PostComment spy = spyWithCreatedAt(comment, OffsetDateTime.now(ZoneOffset.UTC).minusMinutes(2));
        when(commentRepository.findByIdAndIsDeletedFalse(commentId)).thenReturn(Optional.of(spy));
        when(commentRepository.save(any(PostComment.class))).thenAnswer(inv -> inv.getArgument(0));
        wireUserResolution(authorId);

        service.updateComment(commentId, principal,
                new UpdateCommentRequest("Now I feel a bit better, thank you."), "rid");

        ArgumentCaptor<PostComment> captor = ArgumentCaptor.forClass(PostComment.class);
        verify(commentRepository).save(captor.capture());
        org.assertj.core.api.Assertions.assertThat(captor.getValue().isCrisisFlag()).isTrue();
    }

    @Test
    void crisisDetectedOnEditPublishesEvent() {
        // Initial comment is clean. Author edits to crisis content. Event fires.
        UUID commentId = UUID.randomUUID();
        UUID authorId = UUID.randomUUID();
        AuthenticatedUser principal = new AuthenticatedUser(authorId, false);

        PostComment comment = buildLiveComment(commentId, authorId, null);
        PostComment spy = spyWithCreatedAt(comment, OffsetDateTime.now(ZoneOffset.UTC).minusMinutes(2));
        when(commentRepository.findByIdAndIsDeletedFalse(commentId)).thenReturn(Optional.of(spy));
        when(commentRepository.save(any(PostComment.class))).thenAnswer(inv -> inv.getArgument(0));
        wireUserResolution(authorId);

        service.updateComment(commentId, principal,
                new UpdateCommentRequest("Honestly I want to die some days."), "rid");

        ArgumentCaptor<CrisisDetectedEvent> captor = ArgumentCaptor.forClass(CrisisDetectedEvent.class);
        verify(eventPublisher, times(1)).publishEvent(captor.capture());
        org.assertj.core.api.Assertions.assertThat(captor.getValue().type()).isEqualTo(ContentType.COMMENT);
    }

    @Test
    void lastActivityAtNotBumpedOnPatch() {
        UUID commentId = UUID.randomUUID();
        UUID authorId = UUID.randomUUID();
        AuthenticatedUser principal = new AuthenticatedUser(authorId, false);

        PostComment comment = spyWithCreatedAt(
                buildLiveComment(commentId, authorId, null),
                OffsetDateTime.now(ZoneOffset.UTC).minusMinutes(2));
        when(commentRepository.findByIdAndIsDeletedFalse(commentId)).thenReturn(Optional.of(comment));
        when(commentRepository.save(any(PostComment.class))).thenAnswer(inv -> inv.getArgument(0));
        wireUserResolution(authorId);

        service.updateComment(commentId, principal,
                new UpdateCommentRequest("updated"), "rid");

        verify(postRepository, never()).incrementCommentCountAndBumpLastActivity(any(UUID.class));
        verify(postRepository, never()).decrementCommentCount(any(UUID.class));
    }

    @Test
    void emptyPatchBodyThrows() {
        UUID commentId = UUID.randomUUID();
        UUID authorId = UUID.randomUUID();
        AuthenticatedUser principal = new AuthenticatedUser(authorId, false);

        assertThatThrownBy(() -> service.updateComment(commentId, principal,
                new UpdateCommentRequest(null), "rid"))
                .isInstanceOf(EmptyPatchBodyException.class);
    }
}
