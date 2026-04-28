package com.worshiproom.post.comment.dto;

import com.fasterxml.jackson.annotation.JsonInclude;
import com.worshiproom.safety.CrisisResourcesBlock;

import java.util.Map;

/**
 * Response wrapper for {@code POST /api/v1/posts/{postId}/comments}.
 *
 * <p>{@code crisisResources} sits at the response root, parallel to {@code data},
 * NOT inside it. The frontend detects the resources block via
 * {@code response.crisisResources != null}.
 *
 * <p>{@code @JsonInclude(NON_NULL)} drops the field on non-crisis responses so
 * the wire format stays clean. Mirrors {@link com.worshiproom.post.dto.CreatePostResponse}.
 */
@JsonInclude(JsonInclude.Include.NON_NULL)
public record CreateCommentResponse(
        CommentDto data,
        CrisisResourcesBlock crisisResources,
        Map<String, Object> meta
) {

    public static CreateCommentResponse normal(CommentDto data, String requestId) {
        return new CreateCommentResponse(data, null, Map.of("requestId", requestId));
    }

    public static CreateCommentResponse withCrisisResources(CommentDto data, CrisisResourcesBlock block, String requestId) {
        return new CreateCommentResponse(data, block, Map.of("requestId", requestId));
    }
}
