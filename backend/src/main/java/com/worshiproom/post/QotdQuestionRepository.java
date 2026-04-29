package com.worshiproom.post;

import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface QotdQuestionRepository extends JpaRepository<QotdQuestion, String> {

    /**
     * Spec 3.9 — find the active question at the given rotation slot.
     *
     * <p>Spring Data derives:
     * {@code SELECT q FROM QotdQuestion q WHERE q.displayOrder = ?1 AND q.isActive = true}.
     *
     * <p>The partial index {@code idx_qotd_questions_active_order} (created in changeset 019)
     * makes this a single-row index lookup. Returns {@link Optional#empty()} when the slot is
     * vacant or the row at that slot has been toggled {@code is_active=false}.
     */
    Optional<QotdQuestion> findByDisplayOrderAndIsActiveTrue(int displayOrder);
}
