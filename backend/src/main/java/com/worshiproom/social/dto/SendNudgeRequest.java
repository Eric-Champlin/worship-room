package com.worshiproom.social.dto;

import jakarta.validation.constraints.NotNull;

import java.util.UUID;

/** POST /api/v1/social/nudges body. */
public record SendNudgeRequest(
    @NotNull(message = "toUserId is required")
    UUID toUserId
) {}
