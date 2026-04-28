package com.worshiproom.post.comment;

import com.worshiproom.auth.AuthenticatedUser;
import com.worshiproom.post.comment.dto.CommentDto;
import com.worshiproom.post.comment.dto.CreateCommentRequest;
import com.worshiproom.post.comment.dto.CreateCommentResponse;
import com.worshiproom.post.comment.dto.UpdateCommentRequest;
import com.worshiproom.proxy.common.ProxyResponse;
import jakarta.validation.Valid;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.slf4j.MDC;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.net.URI;
import java.util.UUID;

/**
 * Spec 3.6 — write endpoints for prayer-wall comments.
 *
 * <p>The Spec 3.4 GET endpoint stays in {@code PostController}. This controller
 * scopes cleanly to writes so the Spec 3.6 advice and SecurityConfig rules can
 * target {@code com.worshiproom.post.comment} without disturbing existing tests.
 *
 * <p>Auth gating is handled at the SecurityConfig level (method-specific
 * {@code .authenticated()} rules); this controller just inherits the principal
 * from {@code @AuthenticationPrincipal}. Idempotency-Key is optional — null
 * disables idempotency for that request.
 */
@RestController
@RequestMapping("/api/v1")
public class CommentController {

    private static final Logger log = LoggerFactory.getLogger(CommentController.class);

    private final PostCommentService commentService;

    public CommentController(PostCommentService commentService) {
        this.commentService = commentService;
    }

    @PostMapping("/posts/{postId}/comments")
    public ResponseEntity<CreateCommentResponse> createComment(
            @PathVariable UUID postId,
            @AuthenticationPrincipal AuthenticatedUser principal,
            @RequestHeader(value = "Idempotency-Key", required = false) String idempotencyKey,
            @Valid @RequestBody CreateCommentRequest request
    ) {
        UUID authorId = principal.userId();
        String requestId = MDC.get("requestId");
        log.info("Comment create requested userId={} postId={} hasParent={} hasIdempotencyKey={}",
                authorId, postId, request.parentCommentId() != null, idempotencyKey != null);

        CreateCommentResponse response = commentService.createComment(
                postId, authorId, request, idempotencyKey, requestId);
        URI location = URI.create("/api/v1/comments/" + response.data().id());
        return ResponseEntity.created(location).body(response);
    }

    @PatchMapping("/comments/{id}")
    public ResponseEntity<ProxyResponse<CommentDto>> updateComment(
            @PathVariable UUID id,
            @AuthenticationPrincipal AuthenticatedUser principal,
            @Valid @RequestBody UpdateCommentRequest request
    ) {
        String requestId = MDC.get("requestId");
        log.info("Comment update requested editorId={} commentId={}", principal.userId(), id);

        CommentDto dto = commentService.updateComment(id, principal, request, requestId);
        return ResponseEntity.ok(ProxyResponse.of(dto, requestId));
    }

    @DeleteMapping("/comments/{id}")
    public ResponseEntity<Void> deleteComment(
            @PathVariable UUID id,
            @AuthenticationPrincipal AuthenticatedUser principal
    ) {
        String requestId = MDC.get("requestId");
        log.info("Comment delete requested deleterId={} commentId={}", principal.userId(), id);

        commentService.deleteComment(id, principal, requestId);
        return ResponseEntity.noContent().build();
    }
}
