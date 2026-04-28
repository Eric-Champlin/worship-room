package com.worshiproom.post.comment.dto;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/**
 * Inbound request body for {@code PATCH /api/v1/comments/{id}}.
 *
 * <p>Per Spec D12, only {@code content} is editable — {@code parentCommentId},
 * {@code isHelpful}, and {@code crisisFlag} are NOT editable via PATCH (threading
 * is set at creation; helpful is owned by post-author / moderators; crisis flag
 * is moderator-only). {@code @JsonIgnoreProperties(ignoreUnknown=true)} silently
 * drops attempts to PATCH those fields rather than 400'ing — same approach as
 * Spec 3.5's {@code UpdatePostRequest}.
 */
@JsonIgnoreProperties(ignoreUnknown = true)
public record UpdateCommentRequest(
        @NotBlank(message = "Content cannot be empty")
        @Size(max = 5000, message = "Content cannot exceed 5000 characters")
        String content
) {
    /** True when no editable fields are supplied — service maps to 400 EmptyPatchBodyException. */
    public boolean isEmpty() {
        return content == null;
    }
}
