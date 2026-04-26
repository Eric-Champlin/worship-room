package com.worshiproom.activity;

import java.time.LocalDate;

/**
 * Input value object for {@link StreakService#updateStreak}.
 *
 * <p>Spec 2.3 § Architectural Decision 3. Decouples the calculation
 * from the JPA persistence layer. Spec 2.6's controller will build
 * one of these from either an existing {@link StreakState} entity
 * (returning user) or from {@link #fresh()} (new user) before calling
 * the service.
 *
 * @param currentStreak  current consecutive-day count; non-negative
 * @param longestStreak  longest streak ever achieved; non-negative
 * @param lastActiveDate date of the most recent activity, or {@code null}
 *                       if the user has never been active
 */
public record StreakStateData(
    int currentStreak,
    int longestStreak,
    LocalDate lastActiveDate
) {
  public static StreakStateData fresh() {
    return new StreakStateData(0, 0, null);
  }
}
