package com.worshiproom.social.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;

/** POST /api/v1/social/recap-dismissal body. */
public record RecapDismissalRequest(
    @NotBlank(message = "weekStart is required")
    @Pattern(regexp = "\\d{4}-\\d{2}-\\d{2}", message = "weekStart must be YYYY-MM-DD")
    String weekStart
) {}
