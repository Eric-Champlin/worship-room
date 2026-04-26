package com.worshiproom.activity;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

/**
 * Spring Data repository for {@link UserBadge}.
 *
 * <p>Stub for Spec 2.4 — no custom methods. Spec 2.6 will add the methods
 * it needs (likely {@code findAllByUserId}, {@code existsById} via the
 * composite key, and a save call) when it composes this repository with
 * {@link BadgeService} for the {@code POST /api/v1/activity} endpoint.
 *
 * <p>Composite key type is {@link UserBadgeId}, declared by the entity via
 * {@code @IdClass}.
 */
@Repository
public interface BadgeRepository extends JpaRepository<UserBadge, UserBadgeId> {
}
