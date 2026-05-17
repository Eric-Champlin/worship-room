package com.worshiproom.post;

import com.worshiproom.activity.ActivityService;
import com.worshiproom.auth.AuthenticatedUser;
import com.worshiproom.post.dto.AuthorDto;
import com.worshiproom.post.dto.PostDto;
import com.worshiproom.post.dto.UpdatePostRequest;
import com.worshiproom.user.UserRepository;
import jakarta.persistence.EntityManager;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.context.ApplicationEventPublisher;

import java.lang.reflect.Field;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/**
 * Verifies the 5-minute edit window enforcement on PATCH and the window-exempt
 * answered fields. Tests construct a Post with a specific createdAt via reflection
 * (the field is insertable=false so it can't be set via setter).
 */
@ExtendWith(MockitoExtension.class)
class PostEditWindowTest {

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
    @Mock private IntercessorService intercessorService;
    @Mock private AnsweredFeedCache answeredFeedCache;
    @Mock private FriendPrayersService friendPrayersService;

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
                uploadService, intercessorService, answeredFeedCache, friendPrayersService);
    }

    private static Post buildPost(UUID id, UUID userId, OffsetDateTime createdAt) {
        Post p = new Post();
        p.setId(id);
        p.setUserId(userId);
        p.setPostType(PostType.PRAYER_REQUEST);
        p.setContent("original");
        p.setCategory("family");
        p.setVisibility(PostVisibility.PUBLIC);
        p.setModerationStatus(ModerationStatus.APPROVED);
        try {
            Field f = Post.class.getDeclaredField("createdAt");
            f.setAccessible(true);
            f.set(p, createdAt);
        } catch (Exception e) {
            throw new RuntimeException(e);
        }
        return p;
    }

    private void wireMapper(UUID id) {
        PostDto dto = new PostDto(
                id, "prayer_request", "updated", "family",
                false, null, null, null, null,
                "public", false, null, null, "approved", false,
                0, 0, 0, 0, 0, 0,
                OffsetDateTime.now(), OffsetDateTime.now(), OffsetDateTime.now(),
                new AuthorDto(UUID.randomUUID(), "Test", null),
                null,
                null,
                java.util.Set.of(),
                null,
                false   // Spec 7.6 — isFromFriend
        );
        when(postMapper.toDto(any(Post.class))).thenReturn(dto);
    }

    @Test
    void updatePost_contentEdit_within5min_succeeds() {
        UUID userId = UUID.randomUUID();
        UUID postId = UUID.randomUUID();
        Post post = buildPost(postId, userId,
                OffsetDateTime.now(ZoneOffset.UTC).minusMinutes(2));
        when(postRepository.findByIdAndIsDeletedFalse(postId)).thenReturn(Optional.of(post));
        when(postRepository.save(any(Post.class))).thenAnswer(inv -> inv.getArgument(0));
        wireMapper(postId);

        UpdatePostRequest req = new UpdatePostRequest(
                "updated content", null, null, null, null, null, null, null, null, null
        );
        AuthenticatedUser principal = new AuthenticatedUser(userId, false);

        postService.updatePost(postId, principal, req, "rid");

        ArgumentCaptor<Post> captor = ArgumentCaptor.forClass(Post.class);
        verify(postRepository).save(captor.capture());
        assertThat(captor.getValue().getContent()).isEqualTo("updated content");
    }

    @Test
    void updatePost_contentEdit_after5min_throws409() {
        UUID userId = UUID.randomUUID();
        UUID postId = UUID.randomUUID();
        Post post = buildPost(postId, userId,
                OffsetDateTime.now(ZoneOffset.UTC).minusMinutes(10));
        when(postRepository.findByIdAndIsDeletedFalse(postId)).thenReturn(Optional.of(post));

        UpdatePostRequest req = new UpdatePostRequest(
                "too late", null, null, null, null, null, null, null, null, null
        );
        AuthenticatedUser principal = new AuthenticatedUser(userId, false);

        assertThatThrownBy(() -> postService.updatePost(postId, principal, req, "rid"))
                .isInstanceOf(EditWindowExpiredException.class);
    }

    @Test
    void updatePost_markAnswered_after5min_succeeds() {
        UUID userId = UUID.randomUUID();
        UUID postId = UUID.randomUUID();
        Post post = buildPost(postId, userId,
                OffsetDateTime.now(ZoneOffset.UTC).minusMinutes(10));
        when(postRepository.findByIdAndIsDeletedFalse(postId)).thenReturn(Optional.of(post));
        when(postRepository.save(any(Post.class))).thenAnswer(inv -> inv.getArgument(0));
        wireMapper(postId);

        // is_answered is window-exempt
        UpdatePostRequest req = new UpdatePostRequest(
                null, null, null, true, "Praise God!", null, null, null, null, null
        );
        AuthenticatedUser principal = new AuthenticatedUser(userId, false);

        postService.updatePost(postId, principal, req, "rid");

        ArgumentCaptor<Post> captor = ArgumentCaptor.forClass(Post.class);
        verify(postRepository).save(captor.capture());
        assertThat(captor.getValue().isAnswered()).isTrue();
        assertThat(captor.getValue().getAnsweredText()).isEqualTo("Praise God!");
    }

    @Test
    void updatePost_markAnswered_after6hours_succeeds() {
        UUID userId = UUID.randomUUID();
        UUID postId = UUID.randomUUID();
        Post post = buildPost(postId, userId,
                OffsetDateTime.now(ZoneOffset.UTC).minusHours(6));
        when(postRepository.findByIdAndIsDeletedFalse(postId)).thenReturn(Optional.of(post));
        when(postRepository.save(any(Post.class))).thenAnswer(inv -> inv.getArgument(0));
        wireMapper(postId);

        UpdatePostRequest req = new UpdatePostRequest(
                null, null, null, true, null, null, null, null, null, null
        );
        AuthenticatedUser principal = new AuthenticatedUser(userId, false);

        postService.updatePost(postId, principal, req, "rid");

        verify(postRepository).save(any(Post.class));
    }

    @Test
    void updatePost_categoryEdit_after5min_throws409() {
        UUID userId = UUID.randomUUID();
        UUID postId = UUID.randomUUID();
        Post post = buildPost(postId, userId,
                OffsetDateTime.now(ZoneOffset.UTC).minusMinutes(10));
        when(postRepository.findByIdAndIsDeletedFalse(postId)).thenReturn(Optional.of(post));

        UpdatePostRequest req = new UpdatePostRequest(
                null, "health", null, null, null, null, null, null, null, null
        );
        AuthenticatedUser principal = new AuthenticatedUser(userId, false);

        assertThatThrownBy(() -> postService.updatePost(postId, principal, req, "rid"))
                .isInstanceOf(EditWindowExpiredException.class);
    }

    @Test
    void updatePost_isAnsweredAndAnsweredText_atomicTransition() {
        UUID userId = UUID.randomUUID();
        UUID postId = UUID.randomUUID();
        Post post = buildPost(postId, userId,
                OffsetDateTime.now(ZoneOffset.UTC).minusHours(2));
        when(postRepository.findByIdAndIsDeletedFalse(postId)).thenReturn(Optional.of(post));
        when(postRepository.save(any(Post.class))).thenAnswer(inv -> inv.getArgument(0));
        wireMapper(postId);

        // false -> true with text
        UpdatePostRequest req = new UpdatePostRequest(
                null, null, null, true, "Surgery successful!", null, null, null, null, null
        );
        AuthenticatedUser principal = new AuthenticatedUser(userId, false);

        postService.updatePost(postId, principal, req, "rid");

        ArgumentCaptor<Post> captor = ArgumentCaptor.forClass(Post.class);
        verify(postRepository).save(captor.capture());
        Post saved = captor.getValue();
        assertThat(saved.isAnswered()).isTrue();
        assertThat(saved.getAnsweredText()).isEqualTo("Surgery successful!");
        assertThat(saved.getAnsweredAt()).isNotNull();
    }
}
