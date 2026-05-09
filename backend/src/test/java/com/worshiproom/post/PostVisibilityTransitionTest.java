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
 * Visibility 9-cell decision matrix per Divergence 4:
 *  - Downgrade (more restrictive) ALWAYS allowed, regardless of edit window.
 *  - Upgrade (less restrictive) requires the edit window.
 *
 * Order: PRIVATE (0) < FRIENDS (1) < PUBLIC (2).
 */
@ExtendWith(MockitoExtension.class)
class PostVisibilityTransitionTest {

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

    private static Post buildPost(UUID id, UUID userId,
                                   PostVisibility currentVisibility,
                                   OffsetDateTime createdAt) {
        Post p = new Post();
        p.setId(id);
        p.setUserId(userId);
        p.setPostType(PostType.PRAYER_REQUEST);
        p.setContent("original");
        p.setCategory("family");
        p.setVisibility(currentVisibility);
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
                id, "prayer_request", "x", "family",
                false, null, null, null, null,
                "public", false, null, null, "approved", false,
                0, 0, 0, 0,
                OffsetDateTime.now(), OffsetDateTime.now(), OffsetDateTime.now(),
                new AuthorDto(UUID.randomUUID(), "Test", null),
                null,
                null
        );
        when(postMapper.toDto(any(Post.class))).thenReturn(dto);
    }

    private void runTransition(PostVisibility from, PostVisibility to,
                                OffsetDateTime createdAt,
                                boolean expectSuccess) {
        UUID userId = UUID.randomUUID();
        UUID postId = UUID.randomUUID();
        Post post = buildPost(postId, userId, from, createdAt);
        when(postRepository.findByIdAndIsDeletedFalse(postId)).thenReturn(Optional.of(post));
        if (expectSuccess) {
            when(postRepository.save(any(Post.class))).thenAnswer(inv -> inv.getArgument(0));
            wireMapper(postId);
        }

        UpdatePostRequest req = new UpdatePostRequest(
                null, null, to.value(), null, null, null, null, null, null
        );
        AuthenticatedUser principal = new AuthenticatedUser(userId, false);

        if (expectSuccess) {
            postService.updatePost(postId, principal, req, "rid");
            ArgumentCaptor<Post> captor = ArgumentCaptor.forClass(Post.class);
            verify(postRepository).save(captor.capture());
            assertThat(captor.getValue().getVisibility()).isEqualTo(to);
        } else {
            assertThatThrownBy(() -> postService.updatePost(postId, principal, req, "rid"))
                    .isInstanceOf(EditWindowExpiredException.class);
        }
    }

    private OffsetDateTime outsideWindow() {
        return OffsetDateTime.now(ZoneOffset.UTC).minusMinutes(10);
    }

    private OffsetDateTime withinWindow() {
        return OffsetDateTime.now(ZoneOffset.UTC).minusMinutes(2);
    }

    // === Downgrades (always allowed, even outside window) ===

    @Test
    void updatePost_publicToFriends_outsideWindow_succeeds_downgrade() {
        runTransition(PostVisibility.PUBLIC, PostVisibility.FRIENDS, outsideWindow(), true);
    }

    @Test
    void updatePost_publicToPrivate_outsideWindow_succeeds_downgrade() {
        runTransition(PostVisibility.PUBLIC, PostVisibility.PRIVATE, outsideWindow(), true);
    }

    @Test
    void updatePost_friendsToPrivate_outsideWindow_succeeds_downgrade() {
        runTransition(PostVisibility.FRIENDS, PostVisibility.PRIVATE, outsideWindow(), true);
    }

    // === Upgrades (window-required, throw 409 outside) ===

    @Test
    void updatePost_friendsToPublic_outsideWindow_throws409_upgrade() {
        runTransition(PostVisibility.FRIENDS, PostVisibility.PUBLIC, outsideWindow(), false);
    }

    @Test
    void updatePost_privateToFriends_outsideWindow_throws409_upgrade() {
        runTransition(PostVisibility.PRIVATE, PostVisibility.FRIENDS, outsideWindow(), false);
    }

    @Test
    void updatePost_privateToPublic_outsideWindow_throws409_upgrade() {
        runTransition(PostVisibility.PRIVATE, PostVisibility.PUBLIC, outsideWindow(), false);
    }

    // === Upgrades within window (allowed) ===

    @Test
    void updatePost_friendsToPublic_withinWindow_succeeds() {
        runTransition(PostVisibility.FRIENDS, PostVisibility.PUBLIC, withinWindow(), true);
    }

    @Test
    void updatePost_privateToPublic_withinWindow_succeeds() {
        runTransition(PostVisibility.PRIVATE, PostVisibility.PUBLIC, withinWindow(), true);
    }
}
