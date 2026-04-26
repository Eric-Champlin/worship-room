package com.worshiproom.activity;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

/**
 * Spring Data repository for {@link ActivityCount}.
 *
 * <p>Two custom methods beyond the {@link JpaRepository} defaults:
 *
 * <ol>
 *   <li>{@link #incrementCount} — atomic UPSERT. Per Spec 2.5 Architectural
 *       Decision #2: PostgreSQL {@code INSERT ... ON CONFLICT DO UPDATE} is
 *       genuinely atomic at the DB layer (no lock/check race window),
 *       handles the missing-row case in a single round-trip, and has zero
 *       deadlock risk under concurrent writes to different
 *       {@code (userId, countType)} pairs. Verified by the 100-thread
 *       concurrency test in {@code ActivityCountsServiceIntegrationTest}.</li>
 *   <li>{@link #findAllByUserId} — derived query method, returns all rows
 *       for a single user. Used by {@link ActivityCountsService#getAllCounts}
 *       to assemble the zero-filled {@code Map<CountType, Integer>}.</li>
 * </ol>
 *
 * <p>The {@code countType} parameter is the wire-format {@link String}
 * (e.g., {@code "prayerWall"}), not the {@link CountType} enum. Conversion
 * happens in {@link ActivityCountsService} per Spec 2.5 Architectural
 * Decision #2.
 */
@Repository
public interface ActivityCountsRepository extends JpaRepository<ActivityCount, ActivityCountId> {

    /**
     * Atomic counter increment via PostgreSQL UPSERT.
     *
     * <p>If no row exists for {@code (userId, countType)}, INSERT a new row
     * with {@code count_value = 1} and {@code last_updated = NOW()}. If a row
     * already exists, UPDATE it: increment {@code count_value} by 1 and
     * refresh {@code last_updated} to NOW().
     *
     * <p>Native query because Hibernate's JPQL does not support
     * {@code ON CONFLICT}. The {@code @Modifying} annotation tells Spring
     * Data this is a write query that returns void.
     *
     * @param userId    target user (UUID; FK-validated by the DB)
     * @param countType wire-format counter name (e.g., {@code "prayerWall"})
     */
    @Modifying
    @Query(value = """
        INSERT INTO activity_counts (user_id, count_type, count_value, last_updated)
        VALUES (:userId, :countType, 1, NOW())
        ON CONFLICT (user_id, count_type)
        DO UPDATE SET
          count_value = activity_counts.count_value + 1,
          last_updated = NOW()
        """, nativeQuery = true)
    void incrementCount(@Param("userId") UUID userId,
                        @Param("countType") String countType);

    /**
     * All rows for a single user. Spring Data derives the implementation
     * from the method name. Returns an empty list (never {@code null}) when
     * the user has no rows.
     */
    List<ActivityCount> findAllByUserId(UUID userId);
}
