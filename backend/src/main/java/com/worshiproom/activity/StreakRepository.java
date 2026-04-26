package com.worshiproom.activity;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.UUID;

/**
 * Spring Data repository for {@link StreakState}.
 *
 * <p>Stub for Spec 2.3 — no custom methods. Spec 2.6 will add the methods
 * it needs (likely a {@code findByUserId} variant via {@link JpaRepository#findById}
 * and a save call) when it composes this repository with
 * {@link StreakService} for the {@code POST /api/v1/activity} endpoint.
 */
@Repository
public interface StreakRepository extends JpaRepository<StreakState, UUID> {
}
