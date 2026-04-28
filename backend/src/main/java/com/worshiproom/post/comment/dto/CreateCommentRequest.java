package com.worshiproom.post.comment.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

import java.util.UUID;

/**
 * Inbound request body for {@code POST /api/v1/posts/{postId}/comments}.
 *
 * <p>{@code parentCommentId} is optional — null produces a top-level comment.
 * If non-null, the service-layer validation enforces that the parent exists,
 * is not soft-deleted, and lives on the same post (Spec D11 — defends against
 * cross-post phantom threads).
 *
 * <p>Char limit (5000) is larger than the post's 2000 to accommodate longer
 * conversational replies. Sanitization runs server-side via OWASP HTML
 * sanitizer policy and may shrink the content further.
 */
public record CreateCommentRequest(
        @NotBlank(message = "Content cannot be empty")
        @Size(max = 5000, message = "Content cannot exceed 5000 characters")
        String content,
        UUID parentCommentId
) {}
