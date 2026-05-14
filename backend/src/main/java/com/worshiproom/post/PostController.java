package com.worshiproom.post;

import com.worshiproom.auth.AuthenticatedUser;
import com.worshiproom.post.comment.PostCommentService;
import com.worshiproom.post.comment.dto.CommentListResponse;
import com.worshiproom.post.dto.CreatePostRequest;
import com.worshiproom.post.dto.CreatePostResponse;
import com.worshiproom.post.dto.PostDto;
import com.worshiproom.post.dto.PostListResponse;
import com.worshiproom.post.dto.ResolveQuestionRequest;
import com.worshiproom.post.dto.UpdatePostRequest;
import com.worshiproom.post.engagement.BookmarkWriteService;
import com.worshiproom.post.engagement.EngagementService;
import com.worshiproom.post.engagement.ReactionWriteService;
import com.worshiproom.post.engagement.dto.BookmarkResponse;
import com.worshiproom.post.engagement.dto.ReactionsResponse;
import com.worshiproom.post.engagement.dto.ToggleReactionRequest;
import com.worshiproom.post.engagement.dto.ToggleReactionResponse;
import com.worshiproom.proxy.common.ProxyResponse;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.slf4j.MDC;
import org.springframework.http.HttpStatus;
import org.springframework.http.HttpHeaders;
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
    private final ReactionWriteService reactionWriteService;
    private final BookmarkWriteService bookmarkWriteService;

    public PostController(PostService postService,
                          PostCommentService postCommentService,
                          EngagementService engagementService,
                          ReactionWriteService reactionWriteService,
                          BookmarkWriteService bookmarkWriteService) {
        this.postService = postService;
        this.postCommentService = postCommentService;
        this.engagementService = engagementService;
        this.reactionWriteService = reactionWriteService;
        this.bookmarkWriteService = bookmarkWriteService;
    }

    @GetMapping("/posts")
    public ResponseEntity<PostListResponse> listFeed(
            @AuthenticationPrincipal AuthenticatedUser principal,
            @RequestParam(defaultValue = "1") @Min(1) int page,
            @RequestParam(defaultValue = "20") @Min(1) @Max(50) int limit,
            @RequestParam(required = false) String category,
            @RequestParam(required = false) String postType,
            @RequestParam(required = false) String qotdId,
            @RequestParam(required = false, defaultValue = "bumped") String sort,
            // TODO Spec 6.4b: enforce Trust Level 2+ and apply feed slicing
            //
            // Spec 6.4 v1 stub — accepted but ignored. Returns the standard
            // feed identical to ?watch=false. Spec 6.4b will enforce Trust
            // Level 2+ (403 for TL<2) and re-sort the feed (crisis-flagged →
            // mental-health → friends → regular) with deterministic SQL
            // section dividers. The param is accepted now so frontend can
            // pass it without 400 errors and so the API contract is stable
            // when 6.4b lands.
            //
            // Bound as `String` (not primitive `boolean`) because Spring's
            // primitive boolean binding rejects values that aren't strict
            // `"true"`/`"false"` with a 400 (verified during Step 15
            // execution; Plan-Time Divergence #5). String binding accepts
            // any value and lets us return 200 for `?watch=invalid` per the
            // API contract. v1 does not read the value; 6.4b will replace
            // this with `Boolean.parseBoolean(watch)` once Trust Level
            // enforcement is wired.
            @SuppressWarnings("unused")
            @RequestParam(required = false, defaultValue = "false") String watch
    ) {
        UUID viewerId = principal == null ? null : principal.userId();
        log.info("Posts feed requested viewerId={} page={} limit={} category={} postType={} sort={}",
                viewerId, page, limit, category, postType, sort);
        validateCategory(category);
        PostType pt = parsePostType(postType);
        PostService.SortKey sortKey = PostService.SortKey.parse(sort, PostService.SortKey.BUMPED);
        PostListResponse body = postService.listFeed(
                viewerId, page, limit, category, pt, qotdId, sortKey, MDC.get("requestId"));
        // Spec 6.5 — feed carries per-viewer intercessorSummary (firstThree
        // classified against the viewer's friend set). Shared caches between
        // server and client would leak one viewer's classification to another.
        return ResponseEntity.ok()
                .header(HttpHeaders.CACHE_CONTROL, "private, no-store")
                .body(body);
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

    /**
     * Spec 4.4 — Mark a comment as the helpful answer to a question post.
     * Author-only (no admin override). Atomic move + idempotent. Rate-limited
     * to 30/hour per user via {@link ResolveRateLimitService}.
     */
    @PatchMapping("/posts/{id}/resolve")
    public ResponseEntity<ProxyResponse<PostDto>> resolveQuestion(
            @AuthenticationPrincipal AuthenticatedUser principal,
            @PathVariable UUID id,
            @Valid @RequestBody ResolveQuestionRequest request
    ) {
        UUID currentUserId = principal.userId();
        String requestId = MDC.get("requestId");
        log.info("Question resolve requested userId={} postId={} commentId={}",
                currentUserId, id, request.commentId());

        PostDto dto = postService.resolveQuestion(id, request.commentId(), currentUserId, requestId);
        return ResponseEntity.ok(ProxyResponse.of(dto, requestId));
    }

    // ─── Spec 3.7 — Reactions write paths ─────────────────────────────────────

    @PostMapping("/posts/{id}/reactions")
    public ResponseEntity<ProxyResponse<ToggleReactionResponse>> toggleReaction(
            @AuthenticationPrincipal AuthenticatedUser principal,
            @PathVariable UUID id,
            @Valid @RequestBody ToggleReactionRequest request
    ) {
        UUID userId = principal.userId();
        String requestId = MDC.get("requestId");
        log.info("Reaction toggle requested userId={} postId={} reactionType={}",
                userId, id, request.reactionType());

        ToggleReactionResponse body = reactionWriteService.toggle(
                id, userId, request.reactionType(), requestId);

        // Status disambiguates toggle direction: 201 on add, 200 on remove (Spec 3.7 D11).
        HttpStatus status = "added".equals(body.state()) ? HttpStatus.CREATED : HttpStatus.OK;
        return ResponseEntity.status(status).body(ProxyResponse.of(body, requestId));
    }

    @DeleteMapping("/posts/{id}/reactions")
    public ResponseEntity<Void> removeReaction(
            @AuthenticationPrincipal AuthenticatedUser principal,
            @PathVariable UUID id,
            @RequestParam @NotBlank @Pattern(regexp = "^(praying|candle|praising|celebrate)$") String reactionType
    ) {
        UUID userId = principal.userId();
        String requestId = MDC.get("requestId");
        log.info("Reaction remove requested userId={} postId={} reactionType={}",
                userId, id, reactionType);

        reactionWriteService.remove(id, userId, reactionType, requestId);
        return ResponseEntity.noContent().build();
    }

    // ─── Spec 3.7 — Bookmark write paths ──────────────────────────────────────

    @PostMapping("/posts/{id}/bookmark")
    public ResponseEntity<ProxyResponse<BookmarkResponse>> addBookmark(
            @AuthenticationPrincipal AuthenticatedUser principal,
            @PathVariable UUID id
    ) {
        UUID userId = principal.userId();
        String requestId = MDC.get("requestId");
        log.info("Bookmark add requested userId={} postId={}", userId, id);

        BookmarkWriteService.AddResult result = bookmarkWriteService.add(id, userId, requestId);
        // Status disambiguates: 201 on newly-inserted, 200 on idempotent no-op (Spec 3.7 D5).
        HttpStatus status = result.created() ? HttpStatus.CREATED : HttpStatus.OK;
        return ResponseEntity.status(status).body(ProxyResponse.of(result.response(), requestId));
    }

    @DeleteMapping("/posts/{id}/bookmark")
    public ResponseEntity<Void> removeBookmark(
            @AuthenticationPrincipal AuthenticatedUser principal,
            @PathVariable UUID id
    ) {
        UUID userId = principal.userId();
        String requestId = MDC.get("requestId");
        log.info("Bookmark remove requested userId={} postId={}", userId, id);

        bookmarkWriteService.remove(id, userId, requestId);
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
