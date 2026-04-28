package com.worshiproom.post.comment.dto;

import com.worshiproom.post.dto.AuthorDto;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;

/**
 * Outbound comment representation.
 *
 * <p>Excludes {@code is_deleted}/{@code deleted_at} (filtered upstream) and
 * {@code parent_comment_id} is null for top-level comments. The {@code replies}
 * list is always present (never null) — empty array for top-level comments
 * without children. Frontend code expects the field's presence.
 */
public record CommentDto(
        UUID id,
        UUID postId,
        UUID parentCommentId,
        String content,
        boolean isHelpful,
        String moderationStatus,
        boolean crisisFlag,
        OffsetDateTime createdAt,
        OffsetDateTime updatedAt,
        AuthorDto author,
        List<CommentDto> replies
) {}
