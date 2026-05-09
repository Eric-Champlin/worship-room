package com.worshiproom.post;

import ch.qos.logback.classic.Level;
import ch.qos.logback.classic.Logger;
import ch.qos.logback.classic.spi.ILoggingEvent;
import ch.qos.logback.core.read.ListAppender;
import com.worshiproom.activity.ActivityService;
import com.worshiproom.activity.ActivityType;
import com.worshiproom.activity.dto.ActivityRequest;
import com.worshiproom.auth.AuthenticatedUser;
import com.worshiproom.post.comment.CommentNotForThisPostException;
import com.worshiproom.post.comment.PostComment;
import com.worshiproom.post.comment.PostCommentNotFoundException;
import com.worshiproom.post.dto.AuthorDto;
import com.worshiproom.post.dto.CreatePostRequest;
import com.worshiproom.post.dto.CreatePostResponse;
import com.worshiproom.post.dto.PostDto;
import com.worshiproom.post.dto.UpdatePostRequest;
import com.worshiproom.user.UserRepository;
import org.slf4j.LoggerFactory;
import jakarta.persistence.EntityManager;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.context.ApplicationEventPublisher;

import java.time.OffsetDateTime;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/**
 * Unit-level tests for PostService write paths. Mockito-only — no Spring context.
 * Verifies business-logic correctness, especially ordering invariants
 * (rate-limit BEFORE save, AFTER_COMMIT event publish, idempotency before rate-limit).
 */
@ExtendWith(MockitoExtension.class)
class PostServiceWriteTest {

    @Mock private PostRepository postRepository;
    @Mock private PostMapper postMapper;
    @Mock private UserResolverService userResolverService;
    @Mock private ActivityService activityService;
    @Mock private UserRepository userRepository;
    @Mock private QotdQuestionRepository qotdQuestionRepository;
    @Mock private PostsRateLimitService rateLimitService;
    @Mock private PostsIdempotencyService idempotencyService;
    @Mock private ApplicationEventPublisher eventPublisher;
    @Mock private EntityManager entityManager;
    @Mock private com.worshiproom.post.comment.PostCommentRepository commentRepository;
    @Mock private ResolveRateLimitService resolveRateLimitService;
    @Mock private com.worshiproom.upload.UploadService uploadService;

    private final PostsRateLimitConfig config = new PostsRateLimitConfig();
    private PostService postService;

    @BeforeEach
    void setUp() {
        org.owasp.html.PolicyFactory htmlSanitizerPolicy =
                org.owasp.html.Sanitizers.FORMATTING.and(org.owasp.html.Sanitizers.LINKS);
        postService = new PostService(
                postRepository, postMapper, userResolverService,
                activityService, userRepository, qotdQuestionRepository,
                rateLimitService, idempotencyService, eventPublisher, config,
                htmlSanitizerPolicy, entityManager, commentRepository, resolveRateLimitService,
                uploadService);
    }

    private CreatePostRequest sampleRequest() {
        return new CreatePostRequest(
                "prayer_request",
                "Please pray for my family.",
                "family",
                false,
                "public",
                null, null, null, null,
                null, null
        );
    }

    private CreatePostRequest crisisRequest() {
        return new CreatePostRequest(
                "prayer_request",
                "I'm struggling with thoughts of suicide and need prayer.",
                "mental-health",
                false,
                "public",
                null, null, null, null,
                null, null
        );
    }

    private PostDto samplePostDto(UUID id) {
        return new PostDto(
                id, "prayer_request", "Please pray for my family.", "family",
                false, null, null, null, null,
                "public", false, null, null, "approved", false,
                0, 0, 0, 0,
                OffsetDateTime.now(), OffsetDateTime.now(), OffsetDateTime.now(),
                new AuthorDto(UUID.randomUUID(), "Test User", null),
                null,
                null
        );
    }

    private void wireDefaultMocks() {
        when(idempotencyService.lookup(any(UUID.class), any(), anyInt())).thenReturn(Optional.empty());
        when(postRepository.save(any(Post.class))).thenAnswer(inv -> inv.getArgument(0));
        // entityManager.refresh(saved) is a void no-op in unit tests — Mockito's
        // default behavior is fine. The real Hibernate refresh re-reads DB-assigned
        // timestamp columns; the integration test verifies that contract.
        when(postMapper.toDto(any(Post.class))).thenAnswer(inv ->
                samplePostDto(((Post) inv.getArgument(0)).getId()));
    }

    @Test
    void createPost_normalContent_returns201WithoutCrisisBlock() {
        UUID authorId = UUID.randomUUID();
        wireDefaultMocks();

        CreatePostResponse response = postService.createPost(authorId, sampleRequest(), null, "rid");

        assertThat(response.crisisResources()).isNull();
        assertThat(response.data()).isNotNull();
    }

    @Test
    void createPost_crisisKeywordContent_returns201WithCrisisBlock_AndPersistsCrisisFlagTrue() {
        UUID authorId = UUID.randomUUID();
        wireDefaultMocks();

        CreatePostResponse response = postService.createPost(authorId, crisisRequest(), null, "rid");

        assertThat(response.crisisResources()).isNotNull();
        assertThat(response.crisisResources().resources()).isNotEmpty();

        ArgumentCaptor<Post> captor = ArgumentCaptor.forClass(Post.class);
        verify(postRepository).save(captor.capture());
        assertThat(captor.getValue().isCrisisFlag()).isTrue();
    }

    @Test
    void createPost_crisisKeyword_publishesCrisisDetectedEvent() {
        UUID authorId = UUID.randomUUID();
        wireDefaultMocks();

        postService.createPost(authorId, crisisRequest(), null, "rid");

        ArgumentCaptor<com.worshiproom.safety.CrisisDetectedEvent> eventCaptor =
                ArgumentCaptor.forClass(com.worshiproom.safety.CrisisDetectedEvent.class);
        verify(eventPublisher, times(1)).publishEvent(eventCaptor.capture());
        // Spec 3.6 — verify the event carries ContentType.POST.
        assertThat(eventCaptor.getValue().type()).isEqualTo(com.worshiproom.safety.ContentType.POST);
        assertThat(eventCaptor.getValue().authorId()).isEqualTo(authorId);
    }

    @Test
    void createPost_normalContent_doesNotPublishCrisisEvent() {
        UUID authorId = UUID.randomUUID();
        wireDefaultMocks();

        postService.createPost(authorId, sampleRequest(), null, "rid");

        verify(eventPublisher, never()).publishEvent(any(com.worshiproom.safety.CrisisDetectedEvent.class));
    }

    @Test
    void createPost_recordsActivityWithPrayerWallType_inSameTransaction() {
        UUID authorId = UUID.randomUUID();
        wireDefaultMocks();

        postService.createPost(authorId, sampleRequest(), null, "rid");

        ArgumentCaptor<ActivityRequest> captor = ArgumentCaptor.forClass(ActivityRequest.class);
        verify(activityService).recordActivity(eq(authorId), captor.capture());
        assertThat(captor.getValue().activityType()).isEqualTo(ActivityType.PRAYER_WALL);
        assertThat(captor.getValue().sourceFeature()).isEqualTo("prayer-wall-post");
    }

    @Test
    void createPost_rateLimitFires_throws429_andDoesNotPersistPost() {
        UUID authorId = UUID.randomUUID();
        when(idempotencyService.lookup(any(UUID.class), any(), anyInt())).thenReturn(Optional.empty());
        doThrow(new PostsRateLimitException(3600))
                .when(rateLimitService).checkAndConsume(authorId);

        assertThatThrownBy(() -> postService.createPost(authorId, sampleRequest(), null, "rid"))
                .isInstanceOf(PostsRateLimitException.class);

        verify(postRepository, never()).save(any(Post.class));
    }

    @Test
    void createPost_rateLimitFires_throws429_andDoesNotRecordActivity() {
        UUID authorId = UUID.randomUUID();
        when(idempotencyService.lookup(any(UUID.class), any(), anyInt())).thenReturn(Optional.empty());
        doThrow(new PostsRateLimitException(3600))
                .when(rateLimitService).checkAndConsume(authorId);

        assertThatThrownBy(() -> postService.createPost(authorId, sampleRequest(), null, "rid"))
                .isInstanceOf(PostsRateLimitException.class);

        verify(activityService, never()).recordActivity(any(), any());
    }

    @Test
    void createPost_qotdIdMissing_throws400() {
        UUID authorId = UUID.randomUUID();
        when(idempotencyService.lookup(any(UUID.class), any(), anyInt())).thenReturn(Optional.empty());
        when(qotdQuestionRepository.existsById(anyString())).thenReturn(false);

        CreatePostRequest req = new CreatePostRequest(
                "prayer_request", "Please pray.", "family", false, "public",
                null, "qotd-nonexistent", null, null,
                null, null
        );

        assertThatThrownBy(() -> postService.createPost(authorId, req, null, "rid"))
                .isInstanceOf(InvalidQotdIdException.class);

        verify(postRepository, never()).save(any(Post.class));
    }

    @Test
    void createPost_scriptureRefWithoutText_throws400() {
        UUID authorId = UUID.randomUUID();
        when(idempotencyService.lookup(any(UUID.class), any(), anyInt())).thenReturn(Optional.empty());

        CreatePostRequest req = new CreatePostRequest(
                "prayer_request", "Please pray.", "family", false, "public",
                null, null, "John 3:16", null,
                null, null
        );

        assertThatThrownBy(() -> postService.createPost(authorId, req, null, "rid"))
                .isInstanceOf(InvalidScripturePairException.class);

        verify(postRepository, never()).save(any(Post.class));
    }

    @Test
    void createPost_htmlInContent_persistsSanitizedVersion() {
        UUID authorId = UUID.randomUUID();
        wireDefaultMocks();

        CreatePostRequest req = new CreatePostRequest(
                "prayer_request", "<script>alert('x')</script>hello",
                "family", false, "public",
                null, null, null, null,
                null, null
        );

        postService.createPost(authorId, req, null, "rid");

        ArgumentCaptor<Post> captor = ArgumentCaptor.forClass(Post.class);
        verify(postRepository).save(captor.capture());
        // The OWASP sanitizer strips tags; the persisted content should not
        // contain "<script>" or the inner alert payload.
        String content = captor.getValue().getContent();
        assertThat(content).doesNotContain("<script>");
        assertThat(content).doesNotContain("</script>");
        assertThat(content).contains("hello");
    }

    @Test
    void createPost_anonymousPost_setsUserIdToRealAuthor() {
        UUID authorId = UUID.randomUUID();
        wireDefaultMocks();

        CreatePostRequest req = new CreatePostRequest(
                "prayer_request", "anonymous prayer", "family",
                true, "public",
                null, null, null, null,
                null, null
        );

        postService.createPost(authorId, req, null, "rid");

        ArgumentCaptor<Post> captor = ArgumentCaptor.forClass(Post.class);
        verify(postRepository).save(captor.capture());
        // Per Divergence 7: real author UUID stored even when anonymous.
        assertThat(captor.getValue().getUserId()).isEqualTo(authorId);
        assertThat(captor.getValue().isAnonymous()).isTrue();
    }

    // =====================================================================
    // Spec 4.3 — per-type content length enforcement (testimony 5000, others 2000)
    // =====================================================================

    private CreatePostRequest testimonyRequestWithContent(String content) {
        return new CreatePostRequest(
                "testimony", content, null, false, "public",
                null, null, null, null,
                null, null
        );
    }

    private CreatePostRequest prayerRequestWithContent(String content) {
        return new CreatePostRequest(
                "prayer_request", content, "family", false, "public",
                null, null, null, null,
                null, null
        );
    }

    @Test
    void createPost_testimony_5000Chars_succeeds() {
        UUID authorId = UUID.randomUUID();
        wireDefaultMocks();
        String content = "a".repeat(5000);

        CreatePostResponse response = postService.createPost(
                authorId, testimonyRequestWithContent(content), null, "rid");

        assertThat(response.data()).isNotNull();
        ArgumentCaptor<Post> captor = ArgumentCaptor.forClass(Post.class);
        verify(postRepository).save(captor.capture());
        assertThat(captor.getValue().getPostType()).isEqualTo(PostType.TESTIMONY);
        assertThat(captor.getValue().getContent()).hasSize(5000);
    }

    @Test
    void createPost_testimony_5001Chars_throwsContentTooLongException_with5000InMessage() {
        UUID authorId = UUID.randomUUID();
        when(idempotencyService.lookup(any(UUID.class), any(), anyInt())).thenReturn(Optional.empty());
        String content = "a".repeat(5001);

        assertThatThrownBy(() -> postService.createPost(
                authorId, testimonyRequestWithContent(content), null, "rid"))
                .isInstanceOf(ContentTooLongException.class)
                .hasMessageContaining("5000 character limit");

        verify(postRepository, never()).save(any(Post.class));
    }

    @Test
    void createPost_prayerRequest_2000Chars_succeeds() {
        UUID authorId = UUID.randomUUID();
        wireDefaultMocks();
        String content = "a".repeat(2000);

        CreatePostResponse response = postService.createPost(
                authorId, prayerRequestWithContent(content), null, "rid");

        assertThat(response.data()).isNotNull();
        ArgumentCaptor<Post> captor = ArgumentCaptor.forClass(Post.class);
        verify(postRepository).save(captor.capture());
        assertThat(captor.getValue().getContent()).hasSize(2000);
    }

    @Test
    void createPost_prayerRequest_2001Chars_throwsContentTooLongException_with2000InMessage() {
        UUID authorId = UUID.randomUUID();
        when(idempotencyService.lookup(any(UUID.class), any(), anyInt())).thenReturn(Optional.empty());
        String content = "a".repeat(2001);

        assertThatThrownBy(() -> postService.createPost(
                authorId, prayerRequestWithContent(content), null, "rid"))
                .isInstanceOf(ContentTooLongException.class)
                .hasMessageContaining("2000 character limit");

        verify(postRepository, never()).save(any(Post.class));
    }

    /**
     * W15 regression: JSR-303 ceiling raised to 5000 leaves the service layer
     * as the active gate for prayer_request. A 4500-char prayer_request bypasses
     * JSR (under 5000) and hits the service layer where the per-type 2000 cap
     * rejects it. Service-level call here bypasses the JSR layer entirely and
     * proves the service-layer enforcement is correct.
     */
    @Test
    void createPost_prayerRequest_4500Chars_throwsAtServiceLayer_with2000InMessage() {
        UUID authorId = UUID.randomUUID();
        when(idempotencyService.lookup(any(UUID.class), any(), anyInt())).thenReturn(Optional.empty());
        String content = "a".repeat(4500);

        assertThatThrownBy(() -> postService.createPost(
                authorId, prayerRequestWithContent(content), null, "rid"))
                .isInstanceOf(ContentTooLongException.class)
                .hasMessageContaining("2000 character limit");

        verify(postRepository, never()).save(any(Post.class));
    }

    @Test
    void createPost_testimony_doesNotRequireCategory() {
        UUID authorId = UUID.randomUUID();
        wireDefaultMocks();
        // testimony with null category — should not throw MissingCategoryException
        CreatePostRequest req = new CreatePostRequest(
                "testimony", "Praise God for healing.", null, false, "public",
                null, null, null, null,
                null, null
        );

        CreatePostResponse response = postService.createPost(authorId, req, null, "rid");

        assertThat(response.data()).isNotNull();
        verify(postRepository).save(any(Post.class));
    }

    @Test
    void createPost_testimony_recordsPRAYER_WALL_activity_notTestimonyPosted() {
        UUID authorId = UUID.randomUUID();
        wireDefaultMocks();

        postService.createPost(authorId, testimonyRequestWithContent("Praise God."), null, "rid");

        // MPD-3: testimony emits PRAYER_WALL activity, NOT TESTIMONY_POSTED.
        // TESTIMONY_POSTED is deferred to a future spec (post-1.10-followups §27).
        ArgumentCaptor<ActivityRequest> captor = ArgumentCaptor.forClass(ActivityRequest.class);
        verify(activityService).recordActivity(eq(authorId), captor.capture());
        assertThat(captor.getValue().activityType()).isEqualTo(ActivityType.PRAYER_WALL);
    }

    // =====================================================================
    // Spec 4.6 — encouragement: anonymous rejection + 280-char limit
    // =====================================================================

    private CreatePostRequest encouragementRequest(String content, boolean anonymous) {
        return new CreatePostRequest(
                "encouragement", content, "other", anonymous, "public",
                null, null, null, null,
                null, null
        );
    }

    @Test
    void createPost_encouragementWithIsAnonymousTrue_throwsAnonymousNotAllowed() {
        UUID authorId = UUID.randomUUID();
        when(idempotencyService.lookup(any(UUID.class), any(), anyInt())).thenReturn(Optional.empty());

        assertThatThrownBy(() -> postService.createPost(
                authorId, encouragementRequest("Thinking of you all today.", true), null, "rid"))
                .isInstanceOf(AnonymousNotAllowedException.class)
                .hasMessageContaining("encouragement");

        verify(postRepository, never()).save(any(Post.class));
    }

    @Test
    void createPost_encouragementWithIsAnonymousFalse_succeeds() {
        UUID authorId = UUID.randomUUID();
        wireDefaultMocks();

        CreatePostResponse response = postService.createPost(
                authorId, encouragementRequest("A quick word of life.", false), null, "rid");

        assertThat(response.data()).isNotNull();
        ArgumentCaptor<Post> captor = ArgumentCaptor.forClass(Post.class);
        verify(postRepository).save(captor.capture());
        assertThat(captor.getValue().getPostType()).isEqualTo(PostType.ENCOURAGEMENT);
        assertThat(captor.getValue().isAnonymous()).isFalse();
    }

    @Test
    void createPost_encouragementOver280Chars_throwsContentTooLong_with280InMessage() {
        UUID authorId = UUID.randomUUID();
        when(idempotencyService.lookup(any(UUID.class), any(), anyInt())).thenReturn(Optional.empty());
        String over = "x".repeat(281);

        assertThatThrownBy(() -> postService.createPost(
                authorId, encouragementRequest(over, false), null, "rid"))
                .isInstanceOf(ContentTooLongException.class)
                .hasMessageContaining("280 character limit");

        verify(postRepository, never()).save(any(Post.class));
    }

    @Test
    void createPost_prayerRequestWithIsAnonymousTrue_succeeds() {
        // Regression guard: the anonymous rejection is encouragement-only (W13).
        // prayer_request, testimony, question, discussion still accept isAnonymous=true.
        UUID authorId = UUID.randomUUID();
        wireDefaultMocks();

        CreatePostRequest req = new CreatePostRequest(
                "prayer_request", "anonymous prayer request", "family",
                true, "public",
                null, null, null, null,
                null, null
        );

        CreatePostResponse response = postService.createPost(authorId, req, null, "rid");

        assertThat(response.data()).isNotNull();
        ArgumentCaptor<Post> captor = ArgumentCaptor.forClass(Post.class);
        verify(postRepository).save(captor.capture());
        assertThat(captor.getValue().isAnonymous()).isTrue();
    }

    private Post existingPost(UUID id, UUID userId, PostType postType) {
        Post post = new Post();
        post.setId(id);
        post.setUserId(userId);
        post.setPostType(postType);
        post.setContent("original content");
        post.setCategory(postType == PostType.PRAYER_REQUEST ? "family" : null);
        post.setVisibility(PostVisibility.PUBLIC);
        post.setModerationStatus(ModerationStatus.APPROVED);
        post.setAnonymous(false);
        post.setDeleted(false);
        post.setAnswered(false);
        post.setCrisisFlag(false);
        // createdAt is DB-managed (insertable=false) — no setter. Set via reflection
        // so post.getCreatedAt() returns non-null in the edit-window check.
        try {
            java.lang.reflect.Field createdAt = Post.class.getDeclaredField("createdAt");
            createdAt.setAccessible(true);
            createdAt.set(post, OffsetDateTime.now());
        } catch (ReflectiveOperationException e) {
            throw new IllegalStateException(e);
        }
        return post;
    }

    @Test
    void updatePost_testimonyContent_5001Chars_throwsContentTooLongException_with5000InMessage() {
        UUID authorId = UUID.randomUUID();
        UUID postId = UUID.randomUUID();
        Post existing = existingPost(postId, authorId, PostType.TESTIMONY);
        when(postRepository.findByIdAndIsDeletedFalse(postId)).thenReturn(Optional.of(existing));

        UpdatePostRequest req = new UpdatePostRequest(
                "a".repeat(5001), null, null, null, null, null, null, null, null);
        AuthenticatedUser principal = new AuthenticatedUser(authorId, false);

        assertThatThrownBy(() -> postService.updatePost(postId, principal, req, "rid"))
                .isInstanceOf(ContentTooLongException.class)
                .hasMessageContaining("5000 character limit");
    }

    @Test
    void updatePost_prayerRequestContent_2001Chars_throwsContentTooLongException_with2000InMessage() {
        UUID authorId = UUID.randomUUID();
        UUID postId = UUID.randomUUID();
        Post existing = existingPost(postId, authorId, PostType.PRAYER_REQUEST);
        when(postRepository.findByIdAndIsDeletedFalse(postId)).thenReturn(Optional.of(existing));

        UpdatePostRequest req = new UpdatePostRequest(
                "a".repeat(2001), null, null, null, null, null, null, null, null);
        AuthenticatedUser principal = new AuthenticatedUser(authorId, false);

        assertThatThrownBy(() -> postService.updatePost(postId, principal, req, "rid"))
                .isInstanceOf(ContentTooLongException.class)
                .hasMessageContaining("2000 character limit");
    }

    @Test
    void createPost_idempotencyHit_returnsCachedResponse_withoutSecondActivity() {
        UUID authorId = UUID.randomUUID();
        CreatePostResponse cached = CreatePostResponse.normal(samplePostDto(UUID.randomUUID()), "rid");
        when(idempotencyService.lookup(any(UUID.class), eq("key-1"), anyInt()))
                .thenReturn(Optional.of(cached));

        CreatePostResponse response = postService.createPost(authorId, sampleRequest(), "key-1", "rid");

        assertThat(response).isSameAs(cached);
        // No rate-limit consumption, no save, no activity.
        verify(rateLimitService, never()).checkAndConsume(any(UUID.class));
        verify(postRepository, never()).save(any(Post.class));
        verify(activityService, never()).recordActivity(any(), any());
    }

    // ──────────────────────────────────────────────────────────────────────────
    // Spec 4.4 — resolveQuestion tests
    // ──────────────────────────────────────────────────────────────────────────

    /** Build a PostComment in-memory; uses application-set id, post-id, user-id. */
    private PostComment seedComment(UUID id, UUID postId, UUID userId, boolean helpful) {
        PostComment comment = new PostComment();
        comment.setId(id);
        comment.setPostId(postId);
        comment.setUserId(userId);
        comment.setContent("comment content");
        comment.setHelpful(helpful);
        comment.setDeleted(false);
        comment.setModerationStatus(ModerationStatus.APPROVED);
        comment.setCrisisFlag(false);
        return comment;
    }

    private PostDto sampleResolvedDto(UUID postId, UUID resolvedCommentId) {
        return new PostDto(
                postId, "question", "what does this verse mean?", null,
                false, null, null, null, null,
                "public", false, null, null, "approved", false,
                0, 0, 0, 0,
                OffsetDateTime.now(), OffsetDateTime.now(), OffsetDateTime.now(),
                new AuthorDto(UUID.randomUUID(), "Asker", null),
                resolvedCommentId,
                null
        );
    }

    @Test
    void resolveQuestion_first_resolution_sets_post_pointer_and_comment_helpful() {
        UUID authorId = UUID.randomUUID();
        UUID postId = UUID.randomUUID();
        UUID commentId = UUID.randomUUID();
        Post question = existingPost(postId, authorId, PostType.QUESTION);
        PostComment comment = seedComment(commentId, postId, UUID.randomUUID(), false);

        when(postRepository.findByIdAndIsDeletedFalse(postId)).thenReturn(Optional.of(question));
        when(commentRepository.findByIdAndPostIdAndIsDeletedFalse(commentId, postId)).thenReturn(Optional.of(comment));
        when(postRepository.save(any(Post.class))).thenAnswer(inv -> inv.getArgument(0));
        when(postMapper.toDto(any(Post.class))).thenReturn(sampleResolvedDto(postId, commentId));

        PostDto dto = postService.resolveQuestion(postId, commentId, authorId, "rid");

        assertThat(dto.questionResolvedCommentId()).isEqualTo(commentId);
        assertThat(question.getQuestionResolvedCommentId()).isEqualTo(commentId);
        assertThat(comment.isHelpful()).isTrue();
        verify(commentRepository).save(comment);
        verify(postRepository).save(question);
    }

    @Test
    void resolveQuestion_idempotent_when_marking_already_helpful_comment() {
        UUID authorId = UUID.randomUUID();
        UUID postId = UUID.randomUUID();
        UUID commentId = UUID.randomUUID();
        Post question = existingPost(postId, authorId, PostType.QUESTION);
        question.setQuestionResolvedCommentId(commentId);
        PostComment comment = seedComment(commentId, postId, UUID.randomUUID(), true);

        when(postRepository.findByIdAndIsDeletedFalse(postId)).thenReturn(Optional.of(question));
        when(commentRepository.findByIdAndPostIdAndIsDeletedFalse(commentId, postId)).thenReturn(Optional.of(comment));
        when(postMapper.toDto(any(Post.class))).thenReturn(sampleResolvedDto(postId, commentId));

        postService.resolveQuestion(postId, commentId, authorId, "rid");

        // No DB writes on idempotent path.
        verify(commentRepository, never()).save(any(PostComment.class));
        verify(postRepository, never()).save(any(Post.class));
    }

    @Test
    void resolveQuestion_atomic_move_marks_new_unmarks_old() {
        UUID authorId = UUID.randomUUID();
        UUID postId = UUID.randomUUID();
        UUID oldCommentId = UUID.randomUUID();
        UUID newCommentId = UUID.randomUUID();
        Post question = existingPost(postId, authorId, PostType.QUESTION);
        question.setQuestionResolvedCommentId(oldCommentId);
        PostComment oldComment = seedComment(oldCommentId, postId, UUID.randomUUID(), true);
        PostComment newComment = seedComment(newCommentId, postId, UUID.randomUUID(), false);

        when(postRepository.findByIdAndIsDeletedFalse(postId)).thenReturn(Optional.of(question));
        when(commentRepository.findByIdAndPostIdAndIsDeletedFalse(newCommentId, postId)).thenReturn(Optional.of(newComment));
        when(commentRepository.findByIdAndIsDeletedFalse(oldCommentId)).thenReturn(Optional.of(oldComment));
        when(postRepository.save(any(Post.class))).thenAnswer(inv -> inv.getArgument(0));
        when(postMapper.toDto(any(Post.class))).thenReturn(sampleResolvedDto(postId, newCommentId));

        postService.resolveQuestion(postId, newCommentId, authorId, "rid");

        assertThat(oldComment.isHelpful()).isFalse();
        assertThat(newComment.isHelpful()).isTrue();
        assertThat(question.getQuestionResolvedCommentId()).isEqualTo(newCommentId);
        verify(commentRepository).save(oldComment);
        verify(commentRepository).save(newComment);
    }

    @Test
    void resolveQuestion_throws_PostNotAQuestionException_for_prayer_request() {
        UUID authorId = UUID.randomUUID();
        UUID postId = UUID.randomUUID();
        UUID commentId = UUID.randomUUID();
        Post post = existingPost(postId, authorId, PostType.PRAYER_REQUEST);
        when(postRepository.findByIdAndIsDeletedFalse(postId)).thenReturn(Optional.of(post));

        assertThatThrownBy(() -> postService.resolveQuestion(postId, commentId, authorId, "rid"))
                .isInstanceOf(PostNotAQuestionException.class)
                .hasMessageContaining("non-question");
    }

    @Test
    void resolveQuestion_throws_PostNotAQuestionException_for_testimony() {
        UUID authorId = UUID.randomUUID();
        UUID postId = UUID.randomUUID();
        UUID commentId = UUID.randomUUID();
        Post post = existingPost(postId, authorId, PostType.TESTIMONY);
        when(postRepository.findByIdAndIsDeletedFalse(postId)).thenReturn(Optional.of(post));

        assertThatThrownBy(() -> postService.resolveQuestion(postId, commentId, authorId, "rid"))
                .isInstanceOf(PostNotAQuestionException.class);
    }

    @Test
    void resolveQuestion_throws_PostForbiddenException_when_not_author() {
        UUID authorId = UUID.randomUUID();
        UUID otherUserId = UUID.randomUUID();
        UUID postId = UUID.randomUUID();
        UUID commentId = UUID.randomUUID();
        Post question = existingPost(postId, authorId, PostType.QUESTION);
        when(postRepository.findByIdAndIsDeletedFalse(postId)).thenReturn(Optional.of(question));

        // Even if otherUserId is admin (the second arg to AuthenticatedUser),
        // resolveQuestion enforces strict author-only — admin cannot override
        // (Plan-Time Divergence #1, brief W6).
        assertThatThrownBy(() -> postService.resolveQuestion(postId, commentId, otherUserId, "rid"))
                .isInstanceOf(PostForbiddenException.class);
    }

    @Test
    void resolveQuestion_throws_PostNotFoundException_when_post_soft_deleted() {
        UUID authorId = UUID.randomUUID();
        UUID postId = UUID.randomUUID();
        UUID commentId = UUID.randomUUID();
        when(postRepository.findByIdAndIsDeletedFalse(postId)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> postService.resolveQuestion(postId, commentId, authorId, "rid"))
                .isInstanceOf(PostNotFoundException.class);
    }

    @Test
    void resolveQuestion_throws_PostCommentNotFoundException_when_comment_soft_deleted() {
        UUID authorId = UUID.randomUUID();
        UUID postId = UUID.randomUUID();
        UUID commentId = UUID.randomUUID();
        Post question = existingPost(postId, authorId, PostType.QUESTION);
        when(postRepository.findByIdAndIsDeletedFalse(postId)).thenReturn(Optional.of(question));
        when(commentRepository.findByIdAndPostIdAndIsDeletedFalse(commentId, postId)).thenReturn(Optional.empty());
        when(commentRepository.findByIdAndIsDeletedFalse(commentId)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> postService.resolveQuestion(postId, commentId, authorId, "rid"))
                .isInstanceOf(PostCommentNotFoundException.class);
    }

    @Test
    void resolveQuestion_throws_CommentNotForThisPostException_when_comment_belongs_to_different_post() {
        UUID authorId = UUID.randomUUID();
        UUID postId = UUID.randomUUID();
        UUID otherPostId = UUID.randomUUID();
        UUID commentId = UUID.randomUUID();
        Post question = existingPost(postId, authorId, PostType.QUESTION);
        // Comment exists but lives on a DIFFERENT post.
        PostComment commentOnOtherPost = seedComment(commentId, otherPostId, UUID.randomUUID(), false);
        when(postRepository.findByIdAndIsDeletedFalse(postId)).thenReturn(Optional.of(question));
        when(commentRepository.findByIdAndPostIdAndIsDeletedFalse(commentId, postId)).thenReturn(Optional.empty());
        when(commentRepository.findByIdAndIsDeletedFalse(commentId)).thenReturn(Optional.of(commentOnOtherPost));

        assertThatThrownBy(() -> postService.resolveQuestion(postId, commentId, authorId, "rid"))
                .isInstanceOf(CommentNotForThisPostException.class)
                .hasMessageContaining("does not belong");
    }

    @Test
    void resolveQuestion_rolls_back_on_save_failure() {
        UUID authorId = UUID.randomUUID();
        UUID postId = UUID.randomUUID();
        UUID oldCommentId = UUID.randomUUID();
        UUID newCommentId = UUID.randomUUID();
        Post question = existingPost(postId, authorId, PostType.QUESTION);
        question.setQuestionResolvedCommentId(oldCommentId);
        PostComment oldComment = seedComment(oldCommentId, postId, UUID.randomUUID(), true);
        PostComment newComment = seedComment(newCommentId, postId, UUID.randomUUID(), false);

        when(postRepository.findByIdAndIsDeletedFalse(postId)).thenReturn(Optional.of(question));
        when(commentRepository.findByIdAndPostIdAndIsDeletedFalse(newCommentId, postId)).thenReturn(Optional.of(newComment));
        when(commentRepository.findByIdAndIsDeletedFalse(oldCommentId)).thenReturn(Optional.of(oldComment));
        // Mock postRepository.save to throw — Spring's @Transactional rolls back.
        when(postRepository.save(any(Post.class))).thenThrow(new RuntimeException("DB write failed"));

        assertThatThrownBy(() -> postService.resolveQuestion(postId, newCommentId, authorId, "rid"))
                .isInstanceOf(RuntimeException.class)
                .hasMessageContaining("DB write failed");

        // The in-memory mutations were applied on the entities (Mockito does
        // not roll those back), but the SQL-level rollback IS what @Transactional
        // guarantees in production. The unit-level proof here is that the
        // exception escaped and the post.save call was attempted (verifying that
        // the @Transactional boundary covers postRepository.save). The
        // integration test is the actual proof that DB state rolls back.
        verify(postRepository).save(question);
    }

    @Test
    void resolveQuestion_logs_ids_only_no_content() {
        UUID authorId = UUID.randomUUID();
        UUID postId = UUID.randomUUID();
        UUID commentId = UUID.randomUUID();
        Post question = existingPost(postId, authorId, PostType.QUESTION);
        question.setContent("DO NOT LOG THIS SENSITIVE CONTENT");
        PostComment comment = seedComment(commentId, postId, UUID.randomUUID(), false);
        comment.setContent("DO NOT LOG THIS COMMENT TEXT");

        when(postRepository.findByIdAndIsDeletedFalse(postId)).thenReturn(Optional.of(question));
        when(commentRepository.findByIdAndPostIdAndIsDeletedFalse(commentId, postId)).thenReturn(Optional.of(comment));
        when(postRepository.save(any(Post.class))).thenAnswer(inv -> inv.getArgument(0));
        when(postMapper.toDto(any(Post.class))).thenReturn(sampleResolvedDto(postId, commentId));

        // Attach a list appender to the PostService logger to capture log events.
        Logger postServiceLogger = (Logger) LoggerFactory.getLogger(PostService.class);
        ListAppender<ILoggingEvent> appender = new ListAppender<>();
        appender.start();
        postServiceLogger.addAppender(appender);
        try {
            postService.resolveQuestion(postId, commentId, authorId, "rid-42");
        } finally {
            postServiceLogger.detachAppender(appender);
        }

        boolean foundResolveLog = false;
        for (ILoggingEvent event : appender.list) {
            if (event.getLevel() != Level.INFO) continue;
            String formatted = event.getFormattedMessage();
            if (formatted.contains("questionResolved")) {
                foundResolveLog = true;
                assertThat(formatted).contains(postId.toString());
                assertThat(formatted).contains(authorId.toString());
                assertThat(formatted).contains(commentId.toString());
                assertThat(formatted).contains("rid-42");
                // PII rule — no user content in logs.
                assertThat(formatted).doesNotContain("DO NOT LOG THIS SENSITIVE CONTENT");
                assertThat(formatted).doesNotContain("DO NOT LOG THIS COMMENT TEXT");
            }
        }
        assertThat(foundResolveLog).isTrue();
    }

    @Test
    void resolveQuestion_does_not_emit_activity_per_MPD_1() {
        UUID authorId = UUID.randomUUID();
        UUID postId = UUID.randomUUID();
        UUID commentId = UUID.randomUUID();
        Post question = existingPost(postId, authorId, PostType.QUESTION);
        PostComment comment = seedComment(commentId, postId, UUID.randomUUID(), false);
        when(postRepository.findByIdAndIsDeletedFalse(postId)).thenReturn(Optional.of(question));
        when(commentRepository.findByIdAndPostIdAndIsDeletedFalse(commentId, postId)).thenReturn(Optional.of(comment));
        when(postRepository.save(any(Post.class))).thenAnswer(inv -> inv.getArgument(0));
        when(postMapper.toDto(any(Post.class))).thenReturn(sampleResolvedDto(postId, commentId));

        postService.resolveQuestion(postId, commentId, authorId, "rid");

        // Resolve is metadata curation, not activity. No activity events emitted.
        verify(activityService, never()).recordActivity(any(UUID.class), any(ActivityRequest.class));
    }

    @Test
    void resolveQuestion_response_dto_has_non_null_updatedAt_and_questionResolvedCommentId() {
        UUID authorId = UUID.randomUUID();
        UUID postId = UUID.randomUUID();
        UUID commentId = UUID.randomUUID();
        Post question = existingPost(postId, authorId, PostType.QUESTION);
        PostComment comment = seedComment(commentId, postId, UUID.randomUUID(), false);
        when(postRepository.findByIdAndIsDeletedFalse(postId)).thenReturn(Optional.of(question));
        when(commentRepository.findByIdAndPostIdAndIsDeletedFalse(commentId, postId)).thenReturn(Optional.of(comment));
        when(postRepository.save(any(Post.class))).thenAnswer(inv -> inv.getArgument(0));
        when(postMapper.toDto(any(Post.class))).thenReturn(sampleResolvedDto(postId, commentId));

        PostDto dto = postService.resolveQuestion(postId, commentId, authorId, "rid");

        // L1-cache trap regression guard (Phase 3 Addendum item 2).
        assertThat(dto.updatedAt()).isNotNull();
        assertThat(dto.questionResolvedCommentId()).isNotNull();
        assertThat(dto.questionResolvedCommentId()).isEqualTo(commentId);
    }

    // =====================================================================
    // Spec 4.6b — image-claim flow (8 tests)
    // =====================================================================

    private CreatePostRequest testimonyWithImage(String uploadId, String altText) {
        return new CreatePostRequest(
                "testimony", "God answered my prayer.", null, false, "public",
                null, null, null, null,
                uploadId, altText
        );
    }

    private CreatePostRequest questionWithImage(String uploadId, String altText) {
        return new CreatePostRequest(
                "question", "What does this mean?", null, false, "public",
                null, null, null, null,
                uploadId, altText
        );
    }

    private CreatePostRequest prayerWithImage(String uploadId, String altText) {
        return new CreatePostRequest(
                "prayer_request", "Please pray for me.", "family", false, "public",
                null, null, null, null,
                uploadId, altText
        );
    }

    @Test
    void createPost_with_imageUploadId_claims_pending_upload_and_sets_image_url() {
        UUID authorId = UUID.randomUUID();
        UUID uploadId = UUID.fromString("aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa");
        wireDefaultMocks();
        when(uploadService.claimUpload(eq(authorId), eq(uploadId), any(UUID.class)))
                .thenAnswer(inv -> "posts/" + inv.getArgument(2));

        CreatePostResponse response = postService.createPost(
                authorId, testimonyWithImage(uploadId.toString(), "A photo of my family at church."),
                null, "rid");

        assertThat(response.data()).isNotNull();
        ArgumentCaptor<Post> captor = ArgumentCaptor.forClass(Post.class);
        verify(postRepository, times(2)).save(captor.capture()); // initial save + image_url update
        Post finalSave = captor.getAllValues().get(1);
        assertThat(finalSave.getImageUrl()).startsWith("posts/");
        assertThat(finalSave.getImageAltText()).isEqualTo("A photo of my family at church.");
    }

    @Test
    void createPost_with_imageUploadId_belonging_to_other_user_throws_ImageClaimFailedException() {
        UUID authorId = UUID.randomUUID();
        // Don't call wireDefaultMocks() — postMapper.toDto would be unused (throw fires first)
        when(idempotencyService.lookup(any(UUID.class), any(), anyInt())).thenReturn(Optional.empty());
        when(postRepository.save(any(Post.class))).thenAnswer(inv -> inv.getArgument(0));
        when(uploadService.claimUpload(any(UUID.class), any(UUID.class), any(UUID.class)))
                .thenThrow(new com.worshiproom.post.ImageClaimFailedException());

        assertThatThrownBy(() -> postService.createPost(
                authorId,
                testimonyWithImage("aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa", "valid alt text"),
                null, "rid"))
                .isInstanceOf(com.worshiproom.post.ImageClaimFailedException.class);
    }

    @Test
    void createPost_with_imageUploadId_but_null_alt_text_throws_InvalidAltTextException() {
        UUID authorId = UUID.randomUUID();
        when(idempotencyService.lookup(any(UUID.class), any(), anyInt())).thenReturn(Optional.empty());

        assertThatThrownBy(() -> postService.createPost(
                authorId,
                testimonyWithImage("aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa", null),
                null, "rid"))
                .isInstanceOf(com.worshiproom.post.InvalidAltTextException.class);
        verify(uploadService, never()).claimUpload(any(), any(), any());
    }

    @Test
    void createPost_with_imageUploadId_but_whitespace_alt_text_throws_InvalidAltTextException() {
        UUID authorId = UUID.randomUUID();
        when(idempotencyService.lookup(any(UUID.class), any(), anyInt())).thenReturn(Optional.empty());

        assertThatThrownBy(() -> postService.createPost(
                authorId,
                testimonyWithImage("aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa", "    \t  "),
                null, "rid"))
                .isInstanceOf(com.worshiproom.post.InvalidAltTextException.class);
    }

    @Test
    void createPost_with_imageUploadId_on_prayer_request_throws_ImageNotAllowedForPostType() {
        UUID authorId = UUID.randomUUID();
        when(idempotencyService.lookup(any(UUID.class), any(), anyInt())).thenReturn(Optional.empty());

        assertThatThrownBy(() -> postService.createPost(
                authorId,
                prayerWithImage("aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa", "valid alt"),
                null, "rid"))
                .isInstanceOf(com.worshiproom.post.ImageNotAllowedForPostTypeException.class);
        verify(uploadService, never()).claimUpload(any(), any(), any());
    }

    @Test
    void createPost_with_imageUploadId_on_question_succeeds() {
        UUID authorId = UUID.randomUUID();
        UUID uploadId = UUID.fromString("aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa");
        wireDefaultMocks();
        when(uploadService.claimUpload(eq(authorId), eq(uploadId), any(UUID.class)))
                .thenAnswer(inv -> "posts/" + inv.getArgument(2));

        CreatePostResponse response = postService.createPost(
                authorId, questionWithImage(uploadId.toString(), "Diagram of the verse layout"),
                null, "rid");

        assertThat(response.data()).isNotNull();
        verify(uploadService, times(1)).claimUpload(eq(authorId), eq(uploadId), any(UUID.class));
    }

    @Test
    void createPost_without_imageUploadId_succeeds_with_null_image_url() {
        UUID authorId = UUID.randomUUID();
        wireDefaultMocks();

        postService.createPost(authorId, sampleRequest(), null, "rid");

        ArgumentCaptor<Post> captor = ArgumentCaptor.forClass(Post.class);
        verify(postRepository).save(captor.capture());
        assertThat(captor.getValue().getImageUrl()).isNull();
        assertThat(captor.getValue().getImageAltText()).isNull();
        verify(uploadService, never()).claimUpload(any(), any(), any());
    }

    @Test
    void createPost_alt_text_with_crisis_keyword_triggers_crisis_flag() {
        // Spec 4.6b gate 6 — alt text crisis content must be detected even when
        // post content is benign.
        UUID authorId = UUID.randomUUID();
        UUID uploadId = UUID.fromString("aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa");
        wireDefaultMocks();
        when(uploadService.claimUpload(any(UUID.class), any(UUID.class), any(UUID.class)))
                .thenAnswer(inv -> "posts/" + inv.getArgument(2));

        CreatePostResponse response = postService.createPost(
                authorId,
                testimonyWithImage(uploadId.toString(),
                        "I am thinking about suicide and need help"),
                null, "rid");

        assertThat(response.crisisResources()).isNotNull();
        ArgumentCaptor<Post> captor = ArgumentCaptor.forClass(Post.class);
        verify(postRepository, times(2)).save(captor.capture());
        // Both saves should have crisisFlag=true since the entity is shared.
        assertThat(captor.getAllValues().get(0).isCrisisFlag()).isTrue();
    }
}
