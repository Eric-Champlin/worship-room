package com.worshiproom.user;

import java.util.UUID;

/**
 * Forums Wave Spec 1.5g — custom repository operations that don't fit
 * Spring Data's annotation-driven query model.
 *
 * <p>Notably: PostgreSQL {@code UPDATE ... RETURNING} cannot be expressed via
 * Spring Data's {@code @Modifying @Query(nativeQuery=true)} pair —
 * {@code @Modifying} forces {@code executeUpdate()} which rejects any result
 * set, while {@code RETURNING} produces one. The interface-default-method or
 * custom-impl path is the standard workaround.
 */
public interface UserRepositoryCustom {

    /**
     * Atomically increments {@code users.session_generation} for the given user
     * and returns the new value. Single round-trip, single statement, row-lock
     * gives concurrent callers serial increments (no lost updates).
     *
     * @return the post-increment value
     * @throws IllegalStateException if no row matched (unknown userId)
     */
    int incrementSessionGeneration(UUID userId);
}
