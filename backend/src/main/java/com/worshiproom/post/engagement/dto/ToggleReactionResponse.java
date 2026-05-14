package com.worshiproom.post.engagement.dto;

/**
 * Response body for {@code POST /api/v1/posts/{id}/reactions} (Spec 3.7 D11 + 6.6).
 *
 * <p>{@code state} disambiguates toggle direction independent of counter math
 * under network reorder — without it, two near-simultaneous toggles by the
 * same user could leave the client cache in an indeterminate state. Allowed
 * values: {@code "added"} (server inserted a row) or {@code "removed"}
 * (server deleted a row).
 *
 * <p>{@code prayingCount}, {@code candleCount}, and {@code praisingCount}
 * are post-mutation counts for the parent post. All three are returned
 * regardless of which reactionType was toggled so the frontend can update
 * every counter in its local cache without a re-read.
 *
 * <p>Wrapped by {@code ProxyResponse<ToggleReactionResponse>} at the
 * controller layer; envelope shape matches {@code 03-backend-standards.md}.
 */
public record ToggleReactionResponse(
        String reactionType,
        String state,
        int prayingCount,
        int candleCount,
        int praisingCount
) {}
