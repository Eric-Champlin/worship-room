package com.worshiproom.activity.dto;

import java.util.List;

/**
 * Inner payload for the {@code POST /api/v1/activity} response envelope.
 * The controller wraps this in {@code ProxyResponse<ActivityResponseData>}.
 *
 * <p>{@code pointsEarned} is the multiplier-aware delta credited by this
 * call. Always 0 on the record-only (same-activity-same-day) path.
 *
 * <p>On the first-time-today path, {@code pointsEarned} captures retroactive
 * multiplier-tier bumps — adding the 4th distinct activity today bumps the
 * tier from 1.25× to 1.5× and the delta accounts for that retroactive bump.
 * It is NOT "the points value of this single activity."
 */
public record ActivityResponseData(
    int pointsEarned,
    int totalPoints,
    int currentLevel,
    boolean levelUp,
    StreakSnapshot streak,
    List<NewBadge> newBadges,
    MultiplierTierSnapshot multiplierTier
) {}
