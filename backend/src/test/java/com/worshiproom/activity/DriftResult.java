package com.worshiproom.activity;

import java.util.List;

public record DriftResult(
    int pointsEarned,
    int newTotalPoints,
    int newCurrentLevel,
    boolean levelUp,
    int newCurrentStreak,
    int newLongestStreak,
    String streakTransition,
    List<String> newBadgeIds,
    boolean isFreeRepairAvailableAfter
) {
}
