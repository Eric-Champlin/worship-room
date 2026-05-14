package com.worshiproom.verse;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.OffsetDateTime;
import java.util.UUID;

@Repository
public interface VerseSurfacingLogRepository extends JpaRepository<VerseSurfacingLog, UUID> {

    // Both flags REQUIRED per Phase 3 Addendum item 3 / 03-backend-standards.md.
    // clearAutomatically=true so subsequent reads in the same transaction don't
    // return stale entities from the persistence context; flushAutomatically=true
    // so pending in-memory changes reach the DB before the bulk delete fires.
    @Modifying(clearAutomatically = true, flushAutomatically = true)
    @Query("DELETE FROM VerseSurfacingLog v WHERE v.surfacedAt < :cutoff")
    int deleteOlderThan(@Param("cutoff") OffsetDateTime cutoff);
}
