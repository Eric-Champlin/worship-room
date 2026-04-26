package com.worshiproom.activity.dto;

import com.worshiproom.activity.StreakStateData;
import com.worshiproom.activity.StreakTransition;

/**
 * Result of a streak update for one day's activity.
 *
 * <p>Spec 2.3 § Architectural Decision 4. Field order is canonical;
 * Spec 2.6 will serialize this record as part of the
 * {@code POST /api/v1/activity} response body when streak changes are
 * surfaced to the client.
 *
 * <p>{@code shouldCaptureForRepair} is the forward-compatibility bridge
 * to a future repair-application spec. It is set to {@code true} when
 * the transition is {@link StreakTransition#RESET} and the
 * {@code previousStreak} was greater than 1 — mirroring the frontend's
 * {@code capturePreviousStreak(oldStreak)} guard
 * ({@code if (oldStreak <= 1) return;}). THIS spec does not act on the
 * flag; it just reports it correctly.
 *
 * @param newState               the post-update streak state
 * @param transition             which of the four state transitions fired
 * @param previousStreak         value of {@code currentStreak} BEFORE the update
 * @param shouldCaptureForRepair {@code true} iff
 *                               {@code transition == RESET && previousStreak > 1}
 */
public record StreakResult(
    StreakStateData newState,
    StreakTransition transition,
    int previousStreak,
    boolean shouldCaptureForRepair
) {}
