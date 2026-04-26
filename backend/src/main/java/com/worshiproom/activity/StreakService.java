package com.worshiproom.activity;

import com.worshiproom.activity.dto.StreakResult;
import org.springframework.stereotype.Service;
import java.time.LocalDate;

/**
 * Streak calculation service. Pure functions — no Spring dependencies,
 * no database access, no logging, no instrumentation.
 *
 * <p>Faithful port of two frontend pieces:
 * <ul>
 *   <li>{@code updateStreak} from
 *       {@code frontend/src/services/faith-points-storage.ts} — the
 *       four-state streak machine (first-ever / same-day / yesterday /
 *       reset).</li>
 *   <li>{@code isFreeRepairAvailable} from
 *       {@code frontend/src/services/streak-repair-storage.ts} — the
 *       eligibility check (null OR last-use-was-in-a-prior-week).</li>
 * </ul>
 *
 * <p>For matching inputs, this service produces byte-identical output
 * to the frontend implementation. Spec 2.8's drift-detection test will
 * assert this guarantee across shared scenarios.
 *
 * <p><strong>Out of scope per Spec 2.3:</strong> grace-day consumption,
 * grief-pause activation, and repair application (state mutation). The
 * frontend has no equivalents in the activity-streak files; future specs
 * will add them with frontend-first authoring. See spec § Divergences.
 *
 * <p>Spec 2.6 will compose this service with {@link StreakRepository} to
 * read the user's current streak state, calculate the new value, and
 * persist it.
 */
@Service
public class StreakService {

    /**
     * Apply the four-state streak machine to determine the new streak state
     * for the given activity day.
     *
     * <p>Branches in declaration order:
     * <ol>
     *   <li>{@code lastActiveDate == null} → {@link StreakTransition#FIRST_EVER}.
     *       Returns {@code (1, 1, today)}. {@code shouldCaptureForRepair}
     *       is {@code false}.</li>
     *   <li>{@code lastActiveDate.isEqual(today)} →
     *       {@link StreakTransition#SAME_DAY}. Returns the input state
     *       unchanged. {@code shouldCaptureForRepair} is {@code false}.</li>
     *   <li>{@code lastActiveDate.isEqual(today.minusDays(1))} →
     *       {@link StreakTransition#INCREMENT}. Returns
     *       {@code (currentStreak + 1, max(currentStreak + 1, longestStreak), today)}.
     *       {@code shouldCaptureForRepair} is {@code false}.</li>
     *   <li>Else (older than yesterday) → {@link StreakTransition#RESET}.
     *       Returns {@code (1, max(1, longestStreak), today)}.
     *       {@code shouldCaptureForRepair} is {@code true} iff the
     *       pre-update {@code currentStreak} was greater than 1.</li>
     * </ol>
     *
     * @param currentState current streak state; {@code lastActiveDate} may be {@code null}
     * @param today        the user's local-time "today" (caller-provided)
     * @return a {@link StreakResult} with the new state, transition, previous streak, and capture flag
     * @throws IllegalArgumentException if {@code currentState} or {@code today} is {@code null}
     */
    public StreakResult updateStreak(StreakStateData currentState, LocalDate today) {
        if (currentState == null) {
            throw new IllegalArgumentException("currentState must not be null");
        }
        if (today == null) {
            throw new IllegalArgumentException("today must not be null");
        }

        int previousStreak = currentState.currentStreak();
        LocalDate lastActiveDate = currentState.lastActiveDate();

        // Branch 1: first-ever activity
        if (lastActiveDate == null) {
            StreakStateData newState = new StreakStateData(1, 1, today);
            return new StreakResult(newState, StreakTransition.FIRST_EVER, previousStreak, false);
        }

        // Branch 2: already active today
        if (lastActiveDate.isEqual(today)) {
            return new StreakResult(currentState, StreakTransition.SAME_DAY, previousStreak, false);
        }

        // Branch 3: consecutive day (yesterday)
        if (lastActiveDate.isEqual(today.minusDays(1))) {
            int newStreak = previousStreak + 1;
            int newLongest = Math.max(newStreak, currentState.longestStreak());
            StreakStateData newState = new StreakStateData(newStreak, newLongest, today);
            return new StreakResult(newState, StreakTransition.INCREMENT, previousStreak, false);
        }

        // Branch 4: missed day(s) — reset to 1
        int newLongest = Math.max(1, currentState.longestStreak());
        StreakStateData newState = new StreakStateData(1, newLongest, today);
        boolean shouldCaptureForRepair = previousStreak > 1;
        return new StreakResult(newState, StreakTransition.RESET, previousStreak, shouldCaptureForRepair);
    }

    /**
     * Check whether the user's free streak repair is available this week.
     *
     * <p>Faithful port of the frontend {@code isFreeRepairAvailable} function:
     * <ul>
     *   <li>If {@code lastFreeRepairDate} is {@code null} (never used) → {@code true}.</li>
     *   <li>Else → {@code true} iff {@code lastFreeRepairDate} is strictly
     *       before {@code currentWeekStart}.</li>
     * </ul>
     *
     * <p>Equivalent JS: {@code data.lastFreeRepairDate < currentWeekStart}.
     * The Java port uses {@link LocalDate#isBefore} which is strictly
     * less-than (matches JS string comparison on ISO-8601 dates).
     *
     * @param lastFreeRepairDate date of the user's last free repair use, or {@code null} if never used
     * @param currentWeekStart   the Monday of the user's current local-time week (caller-provided)
     * @return {@code true} if the user has a free repair available this week
     * @throws IllegalArgumentException if {@code currentWeekStart} is {@code null}
     */
    public boolean isFreeRepairAvailable(LocalDate lastFreeRepairDate, LocalDate currentWeekStart) {
        if (currentWeekStart == null) {
            throw new IllegalArgumentException("currentWeekStart must not be null");
        }
        if (lastFreeRepairDate == null) {
            return true;
        }
        return lastFreeRepairDate.isBefore(currentWeekStart);
    }
}
