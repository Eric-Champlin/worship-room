package com.worshiproom.activity;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

/**
 * Spring Data repository for {@link UserBadge}.
 *
 * <p>Composite key type is {@link UserBadgeId}, declared by the entity via
 * {@code @IdClass}.
 */
@Repository
public interface BadgeRepository extends JpaRepository<UserBadge, UserBadgeId> {

    /**
     * Return every badge owned by the given user. Empty list (never null) if
     * the user has earned no badges. Used by {@code ActivityService} to build
     * the {@code alreadyEarned} set passed to {@link BadgeService#checkBadges}.
     */
    List<UserBadge> findAllByUserId(UUID userId);

    /**
     * Atomic UPSERT for repeatable badges (currently only
     * {@code full_worship_day}). INSERTs a new row at {@code display_count=1}
     * if absent, or increments {@code display_count} by 1 if present.
     * Refreshes {@code earned_at} to {@code NOW()} on update so the most
     * recent firing is reflected on the badge wall.
     *
     * <p>Native query because Hibernate JPQL does not support
     * {@code ON CONFLICT}. Mirrors
     * {@code ActivityCountsRepository.incrementCount}'s pattern.
     */
    @Modifying
    @Query(value = """
        INSERT INTO user_badges (user_id, badge_id, earned_at, display_count)
        VALUES (:userId, :badgeId, NOW(), 1)
        ON CONFLICT (user_id, badge_id)
        DO UPDATE SET
          display_count = user_badges.display_count + 1,
          earned_at = NOW()
        """, nativeQuery = true)
    void incrementDisplayCount(@Param("userId") UUID userId,
                               @Param("badgeId") String badgeId);
}
