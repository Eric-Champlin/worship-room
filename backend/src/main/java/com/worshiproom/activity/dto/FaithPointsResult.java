package com.worshiproom.activity.dto;

import com.worshiproom.activity.MultiplierTier;

/**
 * Result of a faith-points calculation for a single day's activity set.
 *
 * <p>Spec 2.2 § Architectural Decision 5. Field order is canonical;
 * Spec 2.6 will serialize this record as part of the
 * {@code POST /api/v1/activity} response body.
 */
public record FaithPointsResult(
    int basePoints,
    int activityCount,
    int pointsEarned,
    int totalPoints,
    int currentLevel,
    String currentLevelName,
    int pointsToNextLevel,
    boolean levelUp,
    MultiplierTier multiplierTier
) {}
