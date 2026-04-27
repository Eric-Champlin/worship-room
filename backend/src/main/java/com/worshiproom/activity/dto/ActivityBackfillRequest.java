package com.worshiproom.activity.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotNull;

import java.util.Map;

/**
 * Request body for {@code POST /api/v1/activity/backfill} (Spec 2.10).
 *
 * <p>Carries the user's full pre-cutover localStorage activity history for a
 * one-time idempotent backfill into the five Phase 2 shadow tables. See the
 * spec brief for the upsert strategy per table.
 *
 * <p>Sub-shapes are nested static records here rather than top-level DTOs in
 * {@code dto/} because they are backfill-specific — none are reusable across
 * other Phase 2 endpoints.
 */
public record ActivityBackfillRequest(
    @NotNull(message = "schemaVersion is required")
    Integer schemaVersion,

    @NotNull(message = "userTimezone is required")
    String userTimezone,

    @NotNull(message = "activityLog is required")
    Map<String, ActivityFlags> activityLog,

    @Valid
    @NotNull(message = "faithPoints is required")
    FaithPointsPayload faithPoints,

    @Valid
    @NotNull(message = "streak is required")
    StreakPayload streak,

    @Valid
    @NotNull(message = "badges is required")
    BadgesPayload badges
) {

    /**
     * Per-day activity flags. The 12 booleans match the frontend's
     * {@code DailyActivities} shape; {@code pointsEarned} and {@code multiplier}
     * are optional/ignored fields that ride on the wire.
     */
    public record ActivityFlags(
        boolean mood,
        boolean pray,
        boolean listen,
        boolean prayerWall,
        boolean readingPlan,
        boolean meditate,
        boolean journal,
        boolean gratitude,
        boolean reflection,
        boolean challenge,
        boolean localVisit,
        boolean devotional,
        Integer pointsEarned,
        Number multiplier
    ) {}

    public record FaithPointsPayload(
        @NotNull Integer totalPoints,
        @NotNull Integer currentLevel
    ) {}

    public record StreakPayload(
        @NotNull Integer currentStreak,
        @NotNull Integer longestStreak,
        String lastActiveDate
    ) {}

    public record BadgesPayload(
        @NotNull Map<String, BadgeEntry> earned,

        @Valid
        @NotNull ActivityCountsPayload activityCounts
    ) {}

    public record BadgeEntry(
        String earnedAt,
        Integer count
    ) {}

    /**
     * The 14 counter values mirroring {@code CountType} wire values one-to-one.
     * Each field is the cumulative value at backfill time.
     */
    public record ActivityCountsPayload(
        Integer pray,
        Integer journal,
        Integer meditate,
        Integer listen,
        Integer prayerWall,
        Integer readingPlan,
        Integer gratitude,
        Integer reflection,
        Integer encouragementsSent,
        Integer fullWorshipDays,
        Integer challengesCompleted,
        Integer intercessionCount,
        Integer bibleChaptersRead,
        Integer prayerWallPosts
    ) {}
}
