package com.worshiproom.user;

import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;

import java.util.UUID;

/**
 * Forums Wave Spec 1.5g — custom Spring Data fragment implementing
 * {@link UserRepositoryCustom}.
 *
 * <p>Per Spring Data's "Custom Implementations for Spring Data Repositories"
 * convention, the implementation class name MUST be
 * {@code {InterfaceName}Impl} — i.e., {@code UserRepositoryImpl} — and Spring
 * Data wires this fragment into the auto-generated {@code UserRepository}
 * proxy.
 *
 * <p>The {@code @Transactional} ensures the UPDATE runs inside a transaction
 * (no implicit Hibernate flush trickery). {@code @CacheEvict} clears the
 * {@code user-session-gen} cache so subsequent filter checks see the fresh
 * value.
 */
@Repository
public class UserRepositoryImpl implements UserRepositoryCustom {

    @PersistenceContext
    private EntityManager entityManager;

    @Override
    @Transactional
    @CacheEvict(value = "user-session-gen", key = "#userId")
    public int incrementSessionGeneration(UUID userId) {
        // Flush any pending User updates before the increment so we don't lose
        // them when we clear the persistence context (mirrors @Modifying's
        // flushAutomatically=true semantics).
        entityManager.flush();

        Object result = entityManager.createNativeQuery(
                "UPDATE users SET session_generation = session_generation + 1 "
                + "WHERE id = ?1 RETURNING session_generation")
            .setParameter(1, userId)
            .getSingleResult();

        // Clear the persistence context so subsequent reads of User return
        // fresh state from the DB (mirrors @Modifying's clearAutomatically=true).
        entityManager.clear();

        if (result == null) {
            throw new IllegalStateException(
                "Unknown userId for session-generation increment: " + userId);
        }
        // PostgreSQL returns INTEGER → java.lang.Integer; widen defensively.
        if (result instanceof Number n) {
            return n.intValue();
        }
        throw new IllegalStateException(
            "Unexpected return type from incrementSessionGeneration: " + result.getClass());
    }
}
