package com.worshiproom.auth.session;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface ActiveSessionRepository extends JpaRepository<ActiveSession, UUID> {

    List<ActiveSession> findAllByUserIdOrderByLastSeenAtDesc(UUID userId);

    Optional<ActiveSession> findByJti(UUID jti);

    /**
     * SQL-level throttling per Decision 6 — at most one update per minute per
     * jti. Callers don't need any in-memory state; concurrent calls collapse
     * to one effective write per minute via the {@code WHERE} clause.
     *
     * @return number of rows updated (0 if within throttle window, 1 otherwise)
     */
    @Modifying(clearAutomatically = true, flushAutomatically = true)
    @Query("UPDATE ActiveSession s SET s.lastSeenAt = :now "
         + "WHERE s.jti = :jti AND s.lastSeenAt < :throttleBoundary")
    int touchLastSeen(@Param("jti") UUID jti,
                      @Param("now") OffsetDateTime now,
                      @Param("throttleBoundary") OffsetDateTime throttleBoundary);

    @Modifying(clearAutomatically = true, flushAutomatically = true)
    void deleteByJti(UUID jti);

    @Modifying(clearAutomatically = true, flushAutomatically = true)
    @Query("DELETE FROM ActiveSession s WHERE s.userId = :userId AND s.jti <> :currentJti")
    int deleteAllByUserIdExceptJti(@Param("userId") UUID userId,
                                   @Param("currentJti") UUID currentJti);

    @Modifying(clearAutomatically = true, flushAutomatically = true)
    void deleteAllByUserId(UUID userId);

    @Modifying(clearAutomatically = true, flushAutomatically = true)
    @Query("DELETE FROM ActiveSession s WHERE s.jti IN :jtis")
    int deleteByJtiIn(@Param("jtis") List<UUID> jtis);
}
