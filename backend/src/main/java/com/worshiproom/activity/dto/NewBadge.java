package com.worshiproom.activity.dto;

import com.worshiproom.activity.CelebrationTier;

import java.time.OffsetDateTime;

/**
 * Badge newly earned by an activity call. Returned in the
 * {@code newBadges} array of the {@code /api/v1/activity} response.
 *
 * <p>{@code celebrationTier} serializes as its kebab-case wire string
 * (e.g., "toast", "toast-confetti", "special-toast", "full-screen") via
 * {@link CelebrationTier}'s {@code @JsonValue}-bound accessor.
 */
public record NewBadge(
    String id,
    String name,
    CelebrationTier celebrationTier,
    OffsetDateTime earnedAt
) {}
