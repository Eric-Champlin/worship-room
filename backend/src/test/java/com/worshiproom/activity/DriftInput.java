package com.worshiproom.activity;

import java.time.LocalDate;
import java.util.List;
import java.util.Map;

public record DriftInput(
    String userTimezone,
    LocalDate today,
    LocalDate currentWeekStart,
    int currentTotalPoints,
    int currentLevel,
    int currentStreak,
    int longestStreak,
    LocalDate lastActiveDate,
    LocalDate lastFreeRepairDate,
    Map<String, Boolean> todaysActivitiesBefore,
    String newActivityType,
    List<String> alreadyEarnedBadgeIds,
    int friendCount,
    int encouragementsSent,
    int fullWorshipDays,
    int challengesCompleted,
    int intercessionCount,
    int bibleChaptersRead,
    int prayerWallPosts,
    List<ReadingPlanProgressFixture> readingPlanProgress,
    Map<String, List<Integer>> bibleProgress,
    List<MeditationHistoryFixture> meditationHistory,
    List<String> gratitudeEntryDates,
    int localVisitsTotal,
    List<ListeningHistoryFixture> listeningHistory,
    Map<String, Integer> activityCounts
) {
    public record ReadingPlanProgressFixture(String planSlug, String completedAt) {}
    public record MeditationHistoryFixture(String occurredAt, int durationSeconds) {}
    public record ListeningHistoryFixture(String occurredAt, int durationSeconds) {}
}
