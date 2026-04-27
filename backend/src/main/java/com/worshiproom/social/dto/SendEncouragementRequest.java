package com.worshiproom.social.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.util.UUID;

/**
 * POST /api/v1/social/encouragements body. Plain-text message per Universal
 * Rule 14 — no HTML, no Markdown rendering. 200-char cap matches anti-spam
 * intent.
 */
public record SendEncouragementRequest(
    @NotNull(message = "toUserId is required")
    UUID toUserId,

    @NotBlank(message = "message must not be blank")
    @Size(max = 200, message = "message must be at most 200 characters")
    String message
) {}
