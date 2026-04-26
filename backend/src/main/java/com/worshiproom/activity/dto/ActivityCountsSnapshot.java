package com.worshiproom.activity.dto;

/**
 * Per-user lifetime activity counts. Verbatim port of frontend
 * {@code ActivityCounts} (types/dashboard.ts). All values are non-negative.
 *
 * <p>Used by {@link com.worshiproom.activity.BadgeCheckContext} to drive
 * activity-milestone, community, prayer-wall, and intercession badge
 * eligibility checks.
 */
public record ActivityCountsSnapshot(
    int pray,
    int journal,
    int meditate,
    int listen,
    int prayerWall,
    int readingPlan,
    int gratitude,
    int reflection,
    int encouragementsSent,
    int fullWorshipDays,
    int challengesCompleted,
    int intercessionCount,
    int bibleChaptersRead,
    int prayerWallPosts
) {
    public static ActivityCountsSnapshot zeros() {
        return new ActivityCountsSnapshot(0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0);
    }
}
