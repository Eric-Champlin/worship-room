package com.worshiproom.activity;

import com.worshiproom.activity.dto.ActivityCountsSnapshot;
import com.worshiproom.activity.dto.BibleProgressSnapshot;
import com.worshiproom.activity.dto.GratitudeEntriesSnapshot;
import com.worshiproom.activity.dto.ListeningSession;
import com.worshiproom.activity.dto.LocalVisitsSnapshot;
import com.worshiproom.activity.dto.MeditationSession;
import com.worshiproom.activity.dto.ReadingPlanProgress;
import java.util.Collections;
import java.util.EnumSet;
import java.util.List;
import java.util.Set;

/**
 * Comprehensive input for {@link BadgeService#checkBadges}. Mirrors the
 * frontend's {@code BadgeCheckContext} (services/badge-engine.ts) PLUS the
 * additional localStorage data the frontend reads inside
 * {@code checkForNewBadges} (reading plan progress, bible progress, meditation
 * history, gratitude entries, local visits, listening history).
 *
 * <p>Per Spec 2.4 § Divergence 1, the BACKEND has data only for: streak,
 * level, activity counts, today's activities, post/intercession counts.
 * The remaining fields are forever-empty during the dual-write phase. The
 * service correctly returns no badges from those categories rather than
 * firing incorrectly. Spec 2.8's drift-detection test feeds BOTH the
 * frontend and backend implementations identical context to assert
 * calculation parity.
 *
 * <p>{@code todayActivities} uses {@code Set<ActivityType>} rather than
 * mirroring the frontend's 12-boolean record. The set semantics map cleanly
 * to {@code set.contains(ActivityType.PRAY)} etc. — see
 * {@link BadgeService} category 4 (Full Worship Day) for the consumption
 * pattern.
 *
 * <p>All collection fields are unmodifiable after construction. Callers
 * pass empty collections (via the static factories on each snapshot DTO)
 * when data is unavailable.
 */
public record BadgeCheckContext(
    int currentStreak,
    int longestStreak,
    int currentLevel,
    int previousLevel,
    Set<ActivityType> todayActivities,
    ActivityCountsSnapshot activityCounts,
    int friendCount,
    boolean allActivitiesWereTrueBefore,
    List<ReadingPlanProgress> readingPlanProgress,
    BibleProgressSnapshot bibleProgress,
    List<MeditationSession> meditationHistory,
    GratitudeEntriesSnapshot gratitudeEntries,
    LocalVisitsSnapshot localVisits,
    List<ListeningSession> listeningHistory
) {
    public BadgeCheckContext {
        // Defensive: replace nulls with safe empties so the service body
        // can iterate freely without null guards on every field.
        if (todayActivities == null || todayActivities.isEmpty()) {
            todayActivities = Collections.unmodifiableSet(EnumSet.noneOf(ActivityType.class));
        } else {
            todayActivities = Collections.unmodifiableSet(EnumSet.copyOf(todayActivities));
        }
        activityCounts = activityCounts == null ? ActivityCountsSnapshot.zeros() : activityCounts;
        readingPlanProgress = readingPlanProgress == null
            ? List.of()
            : Collections.unmodifiableList(readingPlanProgress);
        bibleProgress = bibleProgress == null ? BibleProgressSnapshot.empty() : bibleProgress;
        meditationHistory = meditationHistory == null
            ? List.of()
            : Collections.unmodifiableList(meditationHistory);
        gratitudeEntries = gratitudeEntries == null ? GratitudeEntriesSnapshot.empty() : gratitudeEntries;
        localVisits = localVisits == null ? LocalVisitsSnapshot.zero() : localVisits;
        listeningHistory = listeningHistory == null
            ? List.of()
            : Collections.unmodifiableList(listeningHistory);
    }
}
