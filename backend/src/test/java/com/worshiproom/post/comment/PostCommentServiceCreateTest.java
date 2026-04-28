package com.worshiproom.post.comment;

import com.worshiproom.activity.ActivityService;
import com.worshiproom.activity.ActivityType;
import com.worshiproom.activity.dto.ActivityRequest;
import com.worshiproom.post.Post;
import com.worshiproom.post.PostNotFoundException;
import com.worshiproom.post.PostRepository;
import com.worshiproom.post.comment.dto.CreateCommentRequest;
import com.worshiproom.post.comment.dto.CreateCommentResponse;
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

import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/**
 * Unit-level tests for {@link PostCommentService#createComment}. Mockito-only.
 * Asserts ordering invariants (idempotency BEFORE rate limit, rate limit BEFORE save,
 * AFTER_COMMIT event publish, idempotency stored after response built) and the major
 * branches: parent-post lookup, parent-comment cross-post validation, sanitization,
 * crisis detection, activity recording, counter increment.
 *
 * <p>Both {@link Post} and {@link User} have no public no-arg constructor / id setter,
 * so we use Mockito {@code mock(...)} for them.
 */
@ExtendWith(MockitoExtension.class)
class PostCommentServiceCreateTest {

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

    private CreateCommentRequest sampleRequest() {
        return new CreateCommentRequest("Praying for you, friend.", null);
    }

    private CreateCommentRequest crisisRequest() {
        // Substring match against PostCrisisDetector.SELF_HARM_KEYWORDS — "want to die" is canonical.
        return new CreateCommentRequest("I want to die — please pray for me.", null);
    }

    private void wireDefaultMocks() {
        when(idempotencyService.lookup(any(UUID.class), any(), anyInt())).thenReturn(Optional.empty());
        Post parentPost = mock(Post.class);
        when(postRepository.findByIdAndIsDeletedFalse(any(UUID.class))).thenReturn(Optional.of(parentPost));
        when(commentRepository.save(any(PostComment.class))).thenAnswer(inv -> inv.getArgument(0));
        when(postRepository.incrementCommentCountAndBumpLastActivity(any(UUID.class))).thenReturn(1);
        User user = mock(User.class);
        when(user.getId()).thenReturn(UUID.randomUUID());
        when(user.getFirstName()).thenReturn("Test");
        when(userRepository.findById(any(UUID.class))).thenReturn(Optional.of(user));
        when(commentMapper.toDto(any(PostComment.class), any(AuthorDto.class)))
                .thenAnswer(inv -> null);
    }

    @Test
    void idempotencyHitReturnsCachedResponseWithoutRateLimit() {
        UUID postId = UUID.randomUUID();
        UUID authorId = UUID.randomUUID();
        CreateCommentResponse cached = CreateCommentResponse.normal(null, "rid");
        when(idempotencyService.lookup(eq(authorId), anyString(), anyInt())).thenReturn(Optional.of(cached));

        CreateCommentResponse result = service.createComment(postId, authorId, sampleRequest(), "key-1", "rid");

        assertThat(result).isSameAs(cached);
        verify(rateLimitService, never()).checkAndConsume(any(UUID.class));
        verify(commentRepository, never()).save(any(PostComment.class));
    }

    @Test
    void rateLimitFiresBeforeDbInsert() {
        UUID postId = UUID.randomUUID();
        UUID authorId = UUID.randomUUID();
        when(idempotencyService.lookup(any(UUID.class), any(), anyInt())).thenReturn(Optional.empty());
        doThrow(new CommentsRateLimitException(60)).when(rateLimitService).checkAndConsume(authorId);

        assertThatThrownBy(() -> service.createComment(postId, authorId, sampleRequest(), null, "rid"))
                .isInstanceOf(CommentsRateLimitException.class);

        verify(commentRepository, never()).save(any(PostComment.class));
        verify(activityService, never()).recordActivity(any(UUID.class), any(ActivityRequest.class));
    }

    @Test
    void parentPostNotFoundThrows404() {
        UUID postId = UUID.randomUUID();
        UUID authorId = UUID.randomUUID();
        when(idempotencyService.lookup(any(UUID.class), any(), anyInt())).thenReturn(Optional.empty());
        when(postRepository.findByIdAndIsDeletedFalse(postId)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.createComment(postId, authorId, sampleRequest(), null, "rid"))
                .isInstanceOf(PostNotFoundException.class);

        verify(commentRepository, never()).save(any(PostComment.class));
    }

    @Test
    void parentCommentNotInPostThrows400() {
        UUID postId = UUID.randomUUID();
        UUID authorId = UUID.randomUUID();
        UUID parentCommentId = UUID.randomUUID();

        when(idempotencyService.lookup(any(UUID.class), any(), anyInt())).thenReturn(Optional.empty());
        Post parent = mock(Post.class);
        when(postRepository.findByIdAndIsDeletedFalse(postId)).thenReturn(Optional.of(parent));
        when(commentRepository.findByIdAndPostIdAndIsDeletedFalse(parentCommentId, postId))
                .thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.createComment(
                postId, authorId, new CreateCommentRequest("hi", parentCommentId), null, "rid"))
                .isInstanceOf(InvalidParentCommentException.class);

        verify(commentRepository, never()).save(any(PostComment.class));
    }

    @Test
    void crisisKeywordSetsFlagAndPublishesEvent() {
        UUID postId = UUID.randomUUID();
        UUID authorId = UUID.randomUUID();
        wireDefaultMocks();

        CreateCommentResponse response = service.createComment(
                postId, authorId, crisisRequest(), null, "rid");

        ArgumentCaptor<PostComment> commentCaptor = ArgumentCaptor.forClass(PostComment.class);
        verify(commentRepository).save(commentCaptor.capture());
        assertThat(commentCaptor.getValue().isCrisisFlag()).isTrue();

        ArgumentCaptor<CrisisDetectedEvent> eventCaptor =
                ArgumentCaptor.forClass(CrisisDetectedEvent.class);
        verify(eventPublisher, times(1)).publishEvent(eventCaptor.capture());
        assertThat(eventCaptor.getValue().type()).isEqualTo(ContentType.COMMENT);
        assertThat(eventCaptor.getValue().authorId()).isEqualTo(authorId);

        assertThat(response.crisisResources()).isNotNull();
    }

    @Test
    void normalContentOmitsCrisisResources() {
        UUID postId = UUID.randomUUID();
        UUID authorId = UUID.randomUUID();
        wireDefaultMocks();

        CreateCommentResponse response = service.createComment(
                postId, authorId, sampleRequest(), null, "rid");

        assertThat(response.crisisResources()).isNull();
        verify(eventPublisher, never()).publishEvent(any(CrisisDetectedEvent.class));
    }

    @Test
    void activityRecordedWithIntercessionTypeAndCorrectSourceFeature() {
        UUID postId = UUID.randomUUID();
        UUID authorId = UUID.randomUUID();
        wireDefaultMocks();

        service.createComment(postId, authorId, sampleRequest(), null, "rid");

        ArgumentCaptor<ActivityRequest> reqCaptor = ArgumentCaptor.forClass(ActivityRequest.class);
        verify(activityService).recordActivity(eq(authorId), reqCaptor.capture());
        assertThat(reqCaptor.getValue().activityType()).isEqualTo(ActivityType.INTERCESSION);
        assertThat(reqCaptor.getValue().sourceFeature()).isEqualTo("prayer-wall-comment");
    }

    @Test
    void commentCountIncrementCalledExactlyOnce() {
        UUID postId = UUID.randomUUID();
        UUID authorId = UUID.randomUUID();
        wireDefaultMocks();

        service.createComment(postId, authorId, sampleRequest(), null, "rid");

        verify(postRepository, times(1)).incrementCommentCountAndBumpLastActivity(postId);
        verify(postRepository, never()).decrementCommentCount(any(UUID.class));
    }

    @Test
    void emptyContentAfterSanitizeThrows() {
        UUID postId = UUID.randomUUID();
        UUID authorId = UUID.randomUUID();
        when(idempotencyService.lookup(any(UUID.class), any(), anyInt())).thenReturn(Optional.empty());
        Post parent = mock(Post.class);
        when(postRepository.findByIdAndIsDeletedFalse(postId)).thenReturn(Optional.of(parent));

        // OWASP sanitizer strips <script>; trim() leaves empty string.
        CreateCommentRequest request = new CreateCommentRequest("<script>alert('x')</script>", null);

        assertThatThrownBy(() -> service.createComment(postId, authorId, request, null, "rid"))
                .isInstanceOf(EmptyCommentContentException.class);

        verify(commentRepository, never()).save(any(PostComment.class));
    }

    @Test
    void idempotencyStoredAfterSuccessfulCreate() {
        UUID postId = UUID.randomUUID();
        UUID authorId = UUID.randomUUID();
        wireDefaultMocks();

        service.createComment(postId, authorId, sampleRequest(), "key-1", "rid");

        verify(idempotencyService).store(eq(authorId), eq("key-1"), anyInt(), any(CreateCommentResponse.class));
    }

    @Test
    void counterUpdateZeroRowsAffectedThrowsIllegalState() {
        // TOCTOU regression guard: parent post deleted between existence check and counter update.
        // Hand-rolled minimal mocks (no wireDefaultMocks) since the userRepository / commentMapper
        // stubs from the helper are unused on this throw path and Mockito strict mode rejects them.
        UUID postId = UUID.randomUUID();
        UUID authorId = UUID.randomUUID();
        when(idempotencyService.lookup(any(UUID.class), any(), anyInt())).thenReturn(Optional.empty());
        Post parentPost = mock(Post.class);
        when(postRepository.findByIdAndIsDeletedFalse(any(UUID.class))).thenReturn(Optional.of(parentPost));
        when(commentRepository.save(any(PostComment.class))).thenAnswer(inv -> inv.getArgument(0));
        when(postRepository.incrementCommentCountAndBumpLastActivity(postId)).thenReturn(0);

        assertThatThrownBy(() -> service.createComment(postId, authorId, sampleRequest(), null, "rid"))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("affected 0 rows");
    }
}
