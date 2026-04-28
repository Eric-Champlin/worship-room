package com.worshiproom.post.dto;

import com.fasterxml.jackson.annotation.JsonInclude;
import com.worshiproom.safety.CrisisResourcesBlock;

import java.util.Map;

/**
 * Response wrapper for POST /api/v1/posts.
 *
 * <p>Sits at the response root, parallel to {@code data}, NOT inside it. The
 * frontend detects the resources block via {@code response.crisisResources != null}.
 *
 * <p>{@code @JsonInclude(NON_NULL)} drops the field on non-crisis responses so
 * the wire format stays clean.
 */
@JsonInclude(JsonInclude.Include.NON_NULL)
public record CreatePostResponse(
        PostDto data,
        CrisisResourcesBlock crisisResources,
        Map<String, Object> meta
) {

    public static CreatePostResponse normal(PostDto data, String requestId) {
        return new CreatePostResponse(data, null, Map.of("requestId", requestId));
    }

    public static CreatePostResponse withCrisisResources(PostDto data, CrisisResourcesBlock block, String requestId) {
        return new CreatePostResponse(data, block, Map.of("requestId", requestId));
    }
}
