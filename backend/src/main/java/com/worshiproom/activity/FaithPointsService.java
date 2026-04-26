package com.worshiproom.activity;

import com.worshiproom.activity.constants.LevelThresholds;
import com.worshiproom.activity.constants.LevelThresholds.LevelInfo;
import com.worshiproom.activity.constants.MultiplierTiers;
import com.worshiproom.activity.constants.PointValues;
import com.worshiproom.activity.dto.FaithPointsResult;
import org.springframework.stereotype.Service;
import java.util.Set;

/**
 * Faith-points calculation service. Pure function — no Spring dependencies,
 * no database access, no logging, no instrumentation.
 *
 * <p>Faithful port of the frontend
 * {@code calculateDailyPoints} (services/faith-points-storage.ts) and
 * {@code getLevelForPoints} (constants/dashboard/levels.ts). For matching
 * inputs, this service produces byte-identical output to the frontend
 * implementation. Spec 2.8's drift-detection test asserts this guarantee
 * across ~50 shared scenarios.
 *
 * <p>Spec 2.6 composes this service with {@link FaithPointsRepository} to
 * read the user's current {@code totalPoints}, calculate the new value,
 * and persist it.
 */
@Service
public class FaithPointsService {

    /**
     * Calculate the result of completing the given activity set.
     *
     * @param activities          set of activity types completed today
     * @param currentTotalPoints  user's current cumulative points (must be &gt;= 0)
     * @return a {@link FaithPointsResult} with all derived values
     * @throws IllegalArgumentException if {@code activities} is null or
     *         {@code currentTotalPoints} is negative
     */
    public FaithPointsResult calculate(Set<ActivityType> activities, int currentTotalPoints) {
        if (activities == null) {
            throw new IllegalArgumentException("activities must not be null");
        }
        if (currentTotalPoints < 0) {
            throw new IllegalArgumentException(
                "currentTotalPoints must be non-negative; got " + currentTotalPoints);
        }

        int basePoints = 0;
        for (ActivityType type : activities) {
            Integer value = PointValues.POINTS.get(type);
            if (value == null) {
                throw new IllegalArgumentException("No point value defined for " + type);
            }
            basePoints += value;
        }
        int activityCount = activities.size();

        MultiplierTier tier = MultiplierTiers.forActivityCount(activityCount);
        int pointsEarned = (int) Math.round(basePoints * tier.multiplier());
        int newTotalPoints = currentTotalPoints + pointsEarned;

        LevelInfo previousLevel = LevelThresholds.levelForPoints(currentTotalPoints);
        LevelInfo newLevel = LevelThresholds.levelForPoints(newTotalPoints);
        boolean levelUp = newLevel.level() > previousLevel.level();

        return new FaithPointsResult(
            basePoints,
            activityCount,
            pointsEarned,
            newTotalPoints,
            newLevel.level(),
            newLevel.name(),
            newLevel.pointsToNextLevel(),
            levelUp,
            tier
        );
    }
}
