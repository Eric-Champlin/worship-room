package com.worshiproom.post;

import com.worshiproom.activity.ActivityService;
import com.worshiproom.activity.ActivityType;
import com.worshiproom.activity.dto.ActivityRequest;
import com.worshiproom.post.dto.AuthorDto;
import com.worshiproom.post.dto.CreatePostRequest;
import com.worshiproom.post.dto.CreatePostResponse;
import com.worshiproom.post.dto.PostDto;
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

    private final PostsRateLimitConfig config = new PostsRateLimitConfig();
    private PostService postService;

    @BeforeEach
    void setUp() {
        postService = new PostService(
                postRepository, postMapper, userResolverService,
                activityService, userRepository, qotdQuestionRepository,
                rateLimitService, idempotencyService, eventPublisher, config,
                entityManager);
    }

    private CreatePostRequest sampleRequest() {
        return new CreatePostRequest(
                "prayer_request",
                "Please pray for my family.",
                "family",
                false,
                "public",
                null, null, null, null
        );
    }

    private CreatePostRequest crisisRequest() {
        return new CreatePostRequest(
                "prayer_request",
                "I'm struggling with thoughts of suicide and need prayer.",
                "mental-health",
                false,
                "public",
                null, null, null, null
        );
    }

    private PostDto samplePostDto(UUID id) {
        return new PostDto(
                id, "prayer_request", "Please pray for my family.", "family",
                false, null, null, null, null,
                "public", false, null, null, "approved", false,
                0, 0, 0, 0,
                OffsetDateTime.now(), OffsetDateTime.now(), OffsetDateTime.now(),
                new AuthorDto(UUID.randomUUID(), "Test User", null)
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

        verify(eventPublisher, times(1)).publishEvent(any(com.worshiproom.safety.CrisisDetectedEvent.class));
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
                null, "qotd-nonexistent", null, null
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
                null, null, "John 3:16", null
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
                null, null, null, null
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
                null, null, null, null
        );

        postService.createPost(authorId, req, null, "rid");

        ArgumentCaptor<Post> captor = ArgumentCaptor.forClass(Post.class);
        verify(postRepository).save(captor.capture());
        // Per Divergence 7: real author UUID stored even when anonymous.
        assertThat(captor.getValue().getUserId()).isEqualTo(authorId);
        assertThat(captor.getValue().isAnonymous()).isTrue();
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
}
