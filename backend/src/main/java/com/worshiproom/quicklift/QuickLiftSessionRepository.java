package com.worshiproom.quicklift;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.OffsetDateTime;
import java.util.Optional;
import java.util.UUID;

public interface QuickLiftSessionRepository extends JpaRepository<QuickLiftSession, UUID> {

    /**
     * Active session for the (user, post) pair. At most one row at a time —
     * /start rejects with 409 ACTIVE_SESSION_EXISTS when this returns present.
     * The partial index {@code idx_quick_lift_sessions_active} backs this query.
     */
    @Query("SELECT q FROM QuickLiftSession q WHERE q.userId = :userId AND q.postId = :postId "
        + "AND q.completedAt IS NULL AND q.cancelledAt IS NULL")
    Optional<QuickLiftSession> findActiveByUserAndPost(@Param("userId") UUID userId,
                                                      @Param("postId") UUID postId);

    /**
     * Atomic state transition: {@code completed_at = :now WHERE id = :sessionId
     * AND user_id = :userId AND not terminal}. Returns affected row count; 0
     * means the session was already terminal or did not belong to this user.
     * Concurrent complete attempts produce exactly one success via the SQL-side
     * {@code WHERE completed_at IS NULL} guard.
     *
     * <p>Both {@code clearAutomatically=true} and {@code flushAutomatically=true}
     * are required on every bulk {@code @Modifying} query per Phase 3 Execution
     * Reality Addendum item 3 — without them the persistence context returns
     * stale entities and pending changes never reach the DB before the UPDATE.
     */
    @Modifying(clearAutomatically = true, flushAutomatically = true)
    @Query("UPDATE QuickLiftSession q SET q.completedAt = :now "
        + "WHERE q.id = :sessionId AND q.userId = :userId "
        + "AND q.completedAt IS NULL AND q.cancelledAt IS NULL")
    int markCompleted(@Param("sessionId") UUID sessionId,
                      @Param("userId") UUID userId,
                      @Param("now") OffsetDateTime now);

    /**
     * Bulk DELETE for the cleanup job. Native SQL because Postgres-specific
     * {@code LIMIT} inside {@code DELETE ... WHERE id IN (SELECT ... LIMIT N)}
     * is not portable JPQL. Returns affected row count; the job loops until a
     * batch returns fewer than {@code batchSize} rows.
     */
    @Modifying(clearAutomatically = true, flushAutomatically = true)
    @Query(value = "DELETE FROM quick_lift_sessions WHERE id IN ("
        + "SELECT id FROM quick_lift_sessions "
        + "WHERE completed_at IS NULL AND cancelled_at IS NULL AND started_at < :cutoff "
        + "LIMIT :batchSize)", nativeQuery = true)
    int deleteAbandonedBatch(@Param("cutoff") OffsetDateTime cutoff,
                             @Param("batchSize") int batchSize);
}
