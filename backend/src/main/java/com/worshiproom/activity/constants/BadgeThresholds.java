package com.worshiproom.activity.constants;

import com.worshiproom.activity.ActivityType;
import java.util.LinkedHashMap;
import java.util.Map;

/**
 * Threshold values for badge eligibility. Verbatim port of:
 * <ul>
 *   <li>{@code frontend/src/constants/dashboard/badges.ts STREAK_THRESHOLDS}</li>
 *   <li>{@code ACTIVITY_MILESTONE_THRESHOLDS}</li>
 *   <li>{@code COMMUNITY_BADGE_THRESHOLDS}</li>
 * </ul>
 * plus inline thresholds from {@code services/badge-engine.ts} that the
 * frontend defines as local consts (reading plan, bible book, meditation,
 * prayer wall, intercessions, bible chapter, gratitude, local first/seeker,
 * listening).
 *
 * <p>Threshold arrays use {@code int[]} (not {@code List<Integer>}) for
 * concise iteration; activity milestones use a {@code LinkedHashMap} for
 * deterministic iteration order.
 */
public final class BadgeThresholds {

    public static final int[] STREAK = {7, 14, 30, 60, 90, 180, 365};

    /**
     * Per-activity milestone thresholds. Order matches frontend
     * {@code ACTIVITY_MILESTONE_THRESHOLDS} declaration order:
     * pray, journal, meditate, listen, prayerWall.
     */
    public static final Map<ActivityType, int[]> ACTIVITY_MILESTONES;

    static {
        Map<ActivityType, int[]> m = new LinkedHashMap<>();
        m.put(ActivityType.PRAY,         new int[]{1, 100});
        m.put(ActivityType.JOURNAL,      new int[]{1, 50, 100});
        m.put(ActivityType.MEDITATE,     new int[]{1, 25});
        m.put(ActivityType.LISTEN,       new int[]{1, 50});
        m.put(ActivityType.PRAYER_WALL,  new int[]{1});
        ACTIVITY_MILESTONES = Map.copyOf(m);
    }

    public static final int[] FRIENDS = {1, 10};
    public static final int[] ENCOURAGEMENTS = {10, 50};
    public static final int[] READING_PLAN_COMPLETIONS = {1, 3, 10};
    public static final int LOCAL_SUPPORT_VISITS = 5;
    public static final int[] BIBLE_BOOKS = {1, 5, 10, 66};
    public static final int[] MEDITATION_SESSIONS = {10, 50, 100};
    public static final int[] PRAYER_WALL_POSTS = {1, 10};
    public static final int INTERCESSIONS = 25;
    public static final int QUICK_LIFTS = 10;
    public static final int[] BIBLE_CHAPTERS = {1, 10, 25};
    public static final int[] GRATITUDE_TOTAL_DAYS = {30, 100};
    public static final int GRATITUDE_CONSECUTIVE_STREAK = 7;
    public static final int LOCAL_FIRST_VISIT = 1;
    public static final int LISTEN_10_HOURS_SECONDS = 36000;

    private BadgeThresholds() {}
}
