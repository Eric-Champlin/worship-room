package com.worshiproom.activity.dto;

/**
 * Streak state returned in the {@code /api/v1/activity} response.
 *
 * <p>{@code newToday} is true unless the streak transition was
 * {@code SAME_DAY} (i.e., true for FIRST_EVER, INCREMENT, RESET).
 *
 * <p>{@code graceUsed} and {@code graceRemaining} are ALWAYS 0 in the
 * current API. The fields exist for API stability so a future grace-days
 * spec can populate them without a breaking response-shape change. See
 * spec § Architectural Decision #16.
 */
public record StreakSnapshot(
    int current,
    int longest,
    boolean newToday,
    int graceUsed,
    int graceRemaining
) {}
