package com.worshiproom.activity.constants;

import java.util.List;

/**
 * Faith level thresholds. Verbatim port of
 * {@code frontend/src/constants/dashboard/levels.ts LEVEL_THRESHOLDS}.
 *
 * <p>Six levels: Seedling (0) → Sprout (100) → Blooming (500) →
 * Flourishing (1500) → Oak (4000) → Lighthouse (10000). Lighthouse is the
 * cap; {@link LevelInfo#pointsToNextLevel} returns 0 once a user reaches it.
 */
public final class LevelThresholds {

    public record LevelDefinition(int level, String name, int threshold) {}

    public record LevelInfo(int level, String name, int pointsToNextLevel) {}

    public static final List<LevelDefinition> THRESHOLDS = List.of(
        new LevelDefinition(1, "Seedling",    0),
        new LevelDefinition(2, "Sprout",      100),
        new LevelDefinition(3, "Blooming",    500),
        new LevelDefinition(4, "Flourishing", 1500),
        new LevelDefinition(5, "Oak",         4000),
        new LevelDefinition(6, "Lighthouse",  10000)
    );

    /**
     * Returns the level info for a given total points value.
     * Mirrors the frontend's getLevelForPoints reverse-iteration loop.
     */
    public static LevelInfo levelForPoints(int points) {
        for (int i = THRESHOLDS.size() - 1; i >= 0; i--) {
            LevelDefinition def = THRESHOLDS.get(i);
            if (points >= def.threshold()) {
                Integer nextThreshold = (i + 1 < THRESHOLDS.size())
                    ? THRESHOLDS.get(i + 1).threshold()
                    : null;
                int pointsToNext = (nextThreshold != null) ? nextThreshold - points : 0;
                return new LevelInfo(def.level(), def.name(), pointsToNext);
            }
        }
        return new LevelInfo(1, "Seedling", 100);
    }

    private LevelThresholds() {}
}
