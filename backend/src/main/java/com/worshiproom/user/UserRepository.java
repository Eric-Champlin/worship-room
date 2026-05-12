package com.worshiproom.user;

import org.springframework.cache.annotation.Cacheable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.UUID;

/**
 * Composed of:
 * <ul>
 *   <li>The Spring Data {@link JpaRepository} default methods plus finder
 *       methods derived by name.</li>
 *   <li>{@link UserRepositoryCustom} for operations that don't fit the
 *       annotation-driven query model — namely the atomic
 *       {@code UPDATE ... RETURNING} session-generation increment (Spec 1.5g).</li>
 * </ul>
 */
@Repository
public interface UserRepository extends JpaRepository<User, UUID>, UserRepositoryCustom {

    Optional<User> findByEmailIgnoreCase(String email);

    boolean existsByEmailIgnoreCase(String email);

    Optional<User> findByFirstNameIgnoreCaseAndLastNameIgnoreCase(String firstName, String lastName);

    /**
     * Forums Wave Spec 1.5g — cached session-generation read used by
     * {@link com.worshiproom.auth.JwtAuthenticationFilter} on every authenticated
     * request to detect tokens whose {@code gen} claim is stale.
     *
     * <p>Cache backing: {@code CacheConfig} (profile-aware). Dev/test uses
     * {@code ConcurrentMapCacheManager} (unbounded but per-process and short-lived);
     * prod uses {@code RedisCacheManager} wrapped in {@code CircuitBreakingCacheManager}
     * with the TTL from
     * {@code spring.cache.redis.time-to-live.user-session-gen=30s}.
     *
     * <p>When the prod Redis circuit is open, this method falls through to the DB
     * on every call — the correct behavior (always-fresh read) within the filter's
     * performance budget. Cache eviction happens in
     * {@link UserRepositoryCustom#incrementSessionGeneration(UUID)}'s implementation.
     */
    @Cacheable(value = "user-session-gen", key = "#userId")
    @Query("SELECT u.sessionGeneration FROM User u WHERE u.id = :userId")
    Optional<Integer> getSessionGenerationByUserId(@Param("userId") UUID userId);
}
