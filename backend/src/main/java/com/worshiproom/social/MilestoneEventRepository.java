package com.worshiproom.social;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.UUID;

/**
 * Spec 2.5.4b only inserts {@code milestone_events} rows; no read endpoint
 * exists yet. A future spec adds {@code GET /api/v1/users/me/milestone-events}.
 * Until then, the inherited {@link JpaRepository#save} method is the only
 * surface we use.
 */
@Repository
public interface MilestoneEventRepository extends JpaRepository<MilestoneEvent, UUID> {
}
