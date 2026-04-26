package com.worshiproom.activity.constants;

import com.worshiproom.activity.ActivityType;
import java.util.Map;

/**
 * Per-activity base point values. Verbatim port of
 * {@code frontend/src/constants/dashboard/activity-points.ts ACTIVITY_POINTS}.
 */
public final class PointValues {

    public static final Map<ActivityType, Integer> POINTS = Map.ofEntries(
        Map.entry(ActivityType.MOOD,         5),
        Map.entry(ActivityType.PRAY,         10),
        Map.entry(ActivityType.LISTEN,       10),
        Map.entry(ActivityType.PRAYER_WALL,  15),
        Map.entry(ActivityType.READING_PLAN, 15),
        Map.entry(ActivityType.MEDITATE,     20),
        Map.entry(ActivityType.JOURNAL,      25),
        Map.entry(ActivityType.GRATITUDE,    5),
        Map.entry(ActivityType.REFLECTION,   10),
        Map.entry(ActivityType.CHALLENGE,    20),
        Map.entry(ActivityType.LOCAL_VISIT,  10),
        Map.entry(ActivityType.DEVOTIONAL,   10)
    );

    private PointValues() {}
}
