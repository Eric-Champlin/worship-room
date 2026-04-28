package com.worshiproom.post;

import com.worshiproom.auth.AuthenticatedUser;
import com.worshiproom.post.dto.PostDto;
import com.worshiproom.post.dto.PostListResponse;
import com.worshiproom.proxy.common.ProxyResponse;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.slf4j.MDC;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

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

    public PostController(PostService postService) {
        this.postService = postService;
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
