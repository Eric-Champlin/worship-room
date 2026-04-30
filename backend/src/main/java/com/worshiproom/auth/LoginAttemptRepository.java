package com.worshiproom.auth;

import com.worshiproom.user.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.OffsetDateTime;
import java.util.UUID;

/**
 * JPQL UPDATE methods for account-lockout state on the {@link User} entity (Spec 1.5f).
 *
 * Separate from {@link com.worshiproom.user.UserRepository} so the read-mostly
 * contract there is not muddied by {@code @Modifying} UPDATEs. Both methods
 * carry {@code clearAutomatically=true} and {@code flushAutomatically=true}
 * per Phase 3 Execution Reality Addendum item 3 — without these flags the
 * post-update read of the same {@code User} returns a stale persistence-context
 * snapshot (L1 cache trap).
 */
@Repository
public interface LoginAttemptRepository extends JpaRepository<User, UUID> {

    /**
     * Atomically increments failed-login count, optionally resets the sliding window,
     * and conditionally sets {@code lockedUntil} ONLY on the threshold transition.
     * Triple-CASE keeps the operation single-statement so concurrent attempts
     * serialize via Postgres row-level lock.
     *
     * <p>Lock-extension safeguard (Spec 1.5f AC + watch-for #18): {@code lockedUntil}
     * is written only when the new count crosses {@code :maxFailures} for the first
     * time within the current window — i.e., when the OLD count was below threshold
     * AND the new count is at/above it. Continued failed attempts on an already-locked
     * account therefore increment the counter but do NOT extend the lock duration.
     *
     * @param windowCutoff {@code now - windowMinutes} — used to detect a stale window
     * @param maxFailures threshold from {@link AccountLockoutProperties}
     * @param lockUntil {@code now + durationMinutes} — applied only on threshold transition
     * @return rows affected (always 1 for a valid userId; 0 if user was concurrently deleted)
     */
    @Modifying(clearAutomatically = true, flushAutomatically = true)
    @Query("""
        UPDATE User u
        SET u.failedLoginCount = CASE
                WHEN u.failedLoginWindowStart IS NULL
                    OR u.failedLoginWindowStart < :windowCutoff
                THEN 1
                ELSE u.failedLoginCount + 1
            END,
            u.failedLoginWindowStart = CASE
                WHEN u.failedLoginWindowStart IS NULL
                    OR u.failedLoginWindowStart < :windowCutoff
                THEN :now
                ELSE u.failedLoginWindowStart
            END,
            u.lockedUntil = CASE
                WHEN (CASE
                    WHEN u.failedLoginWindowStart IS NULL
                        OR u.failedLoginWindowStart < :windowCutoff
                    THEN 1
                    ELSE u.failedLoginCount + 1
                END) >= :maxFailures
                AND u.failedLoginCount < :maxFailures
                THEN :lockUntil
                ELSE u.lockedUntil
            END
        WHERE u.id = :userId
    """)
    int incrementFailedLogin(@Param("userId") UUID userId,
                              @Param("now") OffsetDateTime now,
                              @Param("windowCutoff") OffsetDateTime windowCutoff,
                              @Param("maxFailures") int maxFailures,
                              @Param("lockUntil") OffsetDateTime lockUntil);

    @Modifying(clearAutomatically = true, flushAutomatically = true)
    @Query("""
        UPDATE User u
        SET u.failedLoginCount = 0,
            u.failedLoginWindowStart = NULL,
            u.lockedUntil = NULL
        WHERE u.id = :userId
    """)
    int resetLoginAttempts(@Param("userId") UUID userId);
}
