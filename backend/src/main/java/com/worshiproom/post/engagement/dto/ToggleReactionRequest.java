package com.worshiproom.post.engagement.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;

/**
 * Request body for {@code POST /api/v1/posts/{id}/reactions} (Spec 3.7 + 6.6 + 6.6b).
 *
 * <p>{@code reactionType} is a String (NOT a Java enum) to forward-compat
 * with future reaction types. Phase 6.6 Answered Wall widened the CHECK
 * and this regex to add {@code 'praising'}; Phase 6.6b further widened
 * both to add {@code 'celebrate'} (the warm sunrise reaction on answered
 * posts). The {@link Pattern} validator gives a clean 400 INVALID_INPUT
 * when the value is unknown — DO NOT let the DB CHECK constraint be the
 * validation surface (it produces a 500 with a leaky stack trace).
 */
public record ToggleReactionRequest(
        @NotBlank
        @Pattern(regexp = "^(praying|candle|praising|celebrate)$",
                 message = "reactionType must be 'praying', 'candle', 'praising', or 'celebrate'")
        String reactionType
) {}
