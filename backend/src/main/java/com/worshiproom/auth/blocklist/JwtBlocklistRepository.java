package com.worshiproom.auth.blocklist;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;

@Repository
public interface JwtBlocklistRepository extends JpaRepository<JwtBlocklistEntry, UUID> {

    /**
     * Hourly cleanup target. {@code @Modifying} both flags mandatory per
     * project convention; without {@code clearAutomatically}, subsequent reads
     * in the same transaction see stale persistence-context state.
     *
     * @return number of rows deleted
     */
    @Modifying(clearAutomatically = true, flushAutomatically = true)
    @Query("DELETE FROM JwtBlocklistEntry b WHERE b.expiresAt < :now")
    int deleteExpired(@Param("now") OffsetDateTime now);

    /**
     * Returns {@code jti} values of all currently-active (non-expired)
     * blocklist entries. Used by {@code JwtBlocklistCleanupJob} to identify
     * orphan {@code active_sessions} rows whose JWT was revoked but the
     * session row failed to delete.
     */
    @Query("SELECT b.jti FROM JwtBlocklistEntry b WHERE b.expiresAt > :now")
    List<UUID> findActiveJtis(@Param("now") OffsetDateTime now);
}
