package com.worshiproom.post.engagement.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;

/**
 * Request body for {@code POST /api/v1/posts/{id}/reactions} (Spec 3.7).
 *
 * <p>{@code reactionType} is a String (NOT a Java enum) to forward-compat
 * with Phase 6.6 Answered Wall, which extends the underlying CHECK
 * constraint with {@code 'praising'} and {@code 'celebrate'}. The
 * {@link Pattern} validator gives a clean 400 INVALID_INPUT when the
 * value is unknown — DO NOT let the DB CHECK constraint be the validation
 * surface (it produces a 500 with a leaky stack trace).
 */
public record ToggleReactionRequest(
        @NotBlank
        @Pattern(regexp = "^(praying|candle)$",
                 message = "reactionType must be 'praying' or 'candle'")
        String reactionType
) {}
