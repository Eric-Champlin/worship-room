package com.worshiproom.mute.dto;

import jakarta.validation.constraints.NotNull;

import java.util.UUID;

/**
 * POST /api/v1/mutes body.
 */
public record MuteUserRequest(
    @NotNull(message = "userId is required")
    UUID userId
) {}
