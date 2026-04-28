package com.worshiproom.post;

import com.worshiproom.auth.AuthenticatedUser;
import com.worshiproom.post.comment.PostCommentService;
import com.worshiproom.post.comment.dto.CommentListResponse;
import com.worshiproom.post.dto.CreatePostRequest;
import com.worshiproom.post.dto.CreatePostResponse;
import com.worshiproom.post.dto.PostDto;
import com.worshiproom.post.dto.PostListResponse;
import com.worshiproom.post.dto.UpdatePostRequest;
import com.worshiproom.post.engagement.EngagementService;
import com.worshiproom.post.engagement.dto.ReactionsResponse;
import com.worshiproom.proxy.common.ProxyResponse;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.slf4j.MDC;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.net.URI;
import java.util.Set;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1")
@Validated
public class PostController {

    private static final Logger log = LoggerFactory.getLogger(PostController.class);

    private static final Set<String> VALID_CATEGORIES = Set.of(
            "health", "mental-health", "family", "work", "grief",
            "gratitude", "praise", "relationships", "other", "discussion"
    );

    private final PostService postService;
    private final PostCommentService postCommentService;
    private final EngagementService engagementService;

    public PostController(PostService postService,
                          PostCommentService postCommentService,
                          EngagementService engagementService) {
        this.postService = postService;
        this.postCommentService = postCommentService;
        this.engagementService = engagementService;
    }

    @GetMapping("/posts")
    public ResponseEntity<PostListResponse> listFeed(
            @AuthenticationPrincipal AuthenticatedUser principal,
            @RequestParam(defaultValue = "1") @Min(1) int page,
            @RequestParam(defaultValue = "20") @Min(1) @Max(50) int limit,
            @RequestParam(required = false) String category,
            @RequestParam(required = false) String postType,
            @RequestParam(required = false) String qotdId,
            @RequestParam(required = false, defaultValue = "bumped") String sort
    ) {
        UUID viewerId = principal == null ? null : principal.userId();
        log.info("Posts feed requested viewerId={} page={} limit={} category={} postType={} sort={}",
                viewerId, page, limit, category, postType, sort);
        validateCategory(category);
        PostType pt = parsePostType(postType);
        PostService.SortKey sortKey = PostService.SortKey.parse(sort, PostService.SortKey.BUMPED);
        PostListResponse body = postService.listFeed(
                viewerId, page, limit, category, pt, qotdId, sortKey, MDC.get("requestId"));
        return ResponseEntity.ok(body);
    }

    @GetMapping("/posts/{id}")
    public ResponseEntity<ProxyResponse<PostDto>> getById(
            @AuthenticationPrincipal AuthenticatedUser principal,
            @PathVariable UUID id
    ) {
        UUID viewerId = principal == null ? null : principal.userId();
        log.info("Post detail requested viewerId={} postId={}", viewerId, id);
        PostDto post = postService.getById(id, viewerId);
        return ResponseEntity.ok(ProxyResponse.of(post, MDC.get("requestId")));
    }

    @GetMapping("/users/{username}/posts")
    public ResponseEntity<PostListResponse> listAuthorPosts(
            @AuthenticationPrincipal AuthenticatedUser principal,
            @PathVariable @NotBlank String username,
            @RequestParam(defaultValue = "1") @Min(1) int page,
            @RequestParam(defaultValue = "20") @Min(1) @Max(50) int limit,
            @RequestParam(required = false, defaultValue = "recent") String sort
    ) {
        UUID viewerId = principal == null ? null : principal.userId();
        log.info("Author posts requested viewerId={} username={} page={} limit={} sort={}",
                viewerId, username, page, limit, sort);
        PostService.SortKey sortKey = PostService.SortKey.parse(sort, PostService.SortKey.RECENT);
        PostListResponse body = postService.listAuthorPosts(
                username, viewerId, page, limit, sortKey, MDC.get("requestId"));
        return ResponseEntity.ok(body);
    }

    @GetMapping("/posts/{id}/comments")
    public ResponseEntity<CommentListResponse> listComments(
            @AuthenticationPrincipal AuthenticatedUser principal,
            @PathVariable UUID id,
            @RequestParam(defaultValue = "1") @Min(1) int page,
            @RequestParam(defaultValue = "20") @Min(1) @Max(50) int limit
    ) {
        UUID viewerId = principal == null ? null : principal.userId();
        log.info("Comments requested viewerId={} postId={} page={} limit={}",
                viewerId, id, page, limit);
        CommentListResponse body = postCommentService.listForPost(
                id, viewerId, page, limit, MDC.get("requestId"));
        return ResponseEntity.ok(body);
    }

    @GetMapping("/users/me/reactions")
    public ResponseEntity<ProxyResponse<ReactionsResponse>> myReactions(
            @AuthenticationPrincipal AuthenticatedUser principal
    ) {
        UUID viewerId = principal.userId();
        log.info("Reactions map requested viewerId={}", viewerId);
        ReactionsResponse body = engagementService.reactionsFor(viewerId);
        return ResponseEntity.ok(ProxyResponse.of(body, MDC.get("requestId")));
    }

    @GetMapping("/users/me/bookmarks")
    public ResponseEntity<PostListResponse> myBookmarks(
            @AuthenticationPrincipal AuthenticatedUser principal,
            @RequestParam(defaultValue = "1") @Min(1) int page,
            @RequestParam(defaultValue = "20") @Min(1) @Max(50) int limit
    ) {
        UUID viewerId = principal.userId();
        log.info("Bookmarks requested viewerId={} page={} limit={}", viewerId, page, limit);
        PostListResponse body = engagementService.listBookmarks(
                viewerId, page, limit, MDC.get("requestId"));
        return ResponseEntity.ok(body);
    }

    @PostMapping("/posts")
    public ResponseEntity<CreatePostResponse> createPost(
            @AuthenticationPrincipal AuthenticatedUser principal,
            @RequestHeader(value = "Idempotency-Key", required = false) String idempotencyKey,
            @Valid @RequestBody CreatePostRequest request
    ) {
        UUID authorId = principal.userId();
        String requestId = MDC.get("requestId");
        log.info("Post create requested userId={} postType={} hasIdempotencyKey={}",
                authorId, request.postType(), idempotencyKey != null);

        CreatePostResponse response = postService.createPost(authorId, request, idempotencyKey, requestId);
        URI location = URI.create("/api/v1/posts/" + response.data().id());
        return ResponseEntity.created(location).body(response);
    }

    @PatchMapping("/posts/{id}")
    public ResponseEntity<ProxyResponse<PostDto>> updatePost(
            @AuthenticationPrincipal AuthenticatedUser principal,
            @PathVariable UUID id,
            @Valid @RequestBody UpdatePostRequest request
    ) {
        String requestId = MDC.get("requestId");
        log.info("Post update requested editorId={} postId={}", principal.userId(), id);

        PostDto dto = postService.updatePost(id, principal, request, requestId);
        return ResponseEntity.ok(ProxyResponse.of(dto, requestId));
    }

    @DeleteMapping("/posts/{id}")
    public ResponseEntity<Void> deletePost(
            @AuthenticationPrincipal AuthenticatedUser principal,
            @PathVariable UUID id
    ) {
        String requestId = MDC.get("requestId");
        log.info("Post delete requested deleterId={} postId={}", principal.userId(), id);

        postService.deletePost(id, principal, requestId);
        return ResponseEntity.noContent().build();
    }

    private static void validateCategory(String category) {
        if (category != null && !VALID_CATEGORIES.contains(category)) {
            throw new InvalidCategoryException(category);
        }
    }

    private static PostType parsePostType(String raw) {
        if (raw == null || raw.isBlank()) {
            return null;
        }
        try {
            return PostType.fromValue(raw);
        } catch (IllegalArgumentException e) {
            throw new InvalidPostTypeException(raw);
        }
    }
}
