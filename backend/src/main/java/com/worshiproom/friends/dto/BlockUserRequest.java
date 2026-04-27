package com.worshiproom.friends.dto;

import jakarta.validation.constraints.NotNull;

import java.util.UUID;

/**
 * POST /api/v1/users/me/blocks body.
 */
public record BlockUserRequest(
    @NotNull(message = "userId is required")
    UUID userId
) {}
