package com.worshiproom.activity;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;

/**
 * Spring Data repository for {@link ActivityLog}.
 *
 * <p>Two custom queries supplement the inherited CRUD operations:
 * <ul>
 *   <li>{@link #countTodaysOccurrences} — used by {@code ActivityService} to
 *       detect first-time-today BEFORE saving the new activity_log row.
 *   <li>{@link #findDistinctActivityTypesToday} — used to assemble the
 *       {@code oldSet} for the points-delta computation.
 * </ul>
 *
 * <p>Both queries take an explicit half-open {@code [start, end)} window so
 * the caller controls the exact timezone-aware day boundaries (no
 * {@code BETWEEN}, no {@code LocalTime.MAX} truncation).
 */
@Repository
public interface ActivityLogRepository extends JpaRepository<ActivityLog, UUID> {

    /**
     * Count rows matching {@code (userId, activityType wire string)} where
     * {@code occurredAt} falls in the half-open window {@code [start, end)}.
     */
    @Query("""
        SELECT COUNT(a) FROM ActivityLog a
        WHERE a.userId = :userId
          AND a.activityType = :activityType
          AND a.occurredAt >= :start
          AND a.occurredAt < :end
        """)
    long countTodaysOccurrences(@Param("userId") UUID userId,
                                @Param("activityType") String activityType,
                                @Param("start") OffsetDateTime start,
                                @Param("end") OffsetDateTime end);

    /**
     * Distinct {@code activity_type} wire strings the user logged in the
     * window {@code [start, end)}. Wire strings are converted to
     * {@link ActivityType} in the service layer.
     */
    @Query("""
        SELECT DISTINCT a.activityType FROM ActivityLog a
        WHERE a.userId = :userId
          AND a.occurredAt >= :start
          AND a.occurredAt < :end
        """)
    List<String> findDistinctActivityTypesToday(@Param("userId") UUID userId,
                                                @Param("start") OffsetDateTime start,
                                                @Param("end") OffsetDateTime end);
}
