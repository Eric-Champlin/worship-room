package com.worshiproom.friends.dto;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.util.UUID;

/**
 * POST /api/v1/users/me/friend-requests body. Plain-text message per
 * Universal Rule 14 — no HTML, no Markdown rendering. The 280-char cap
 * matches the existing frontend friend-request UX.
 */
public record SendFriendRequestRequest(
    @NotNull(message = "toUserId is required")
    UUID toUserId,

    @Size(max = 280, message = "message must be at most 280 characters")
    String message
) {}
