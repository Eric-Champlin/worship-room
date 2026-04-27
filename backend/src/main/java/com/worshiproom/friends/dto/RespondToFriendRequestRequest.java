package com.worshiproom.friends.dto;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;

/**
 * PATCH /api/v1/friend-requests/{id} body. Single-field action enum
 * dispatched server-side per Spec 2.5.3 Divergence 3. Pattern regex is
 * the source of truth for valid values; no shadow Java enum.
 */
public record RespondToFriendRequestRequest(
    @NotNull(message = "action is required")
    @Pattern(regexp = "^(accept|decline|cancel)$",
             message = "action must be 'accept', 'decline', or 'cancel'")
    String action
) {}
