package com.worshiproom.post;

import java.util.Optional;

import com.worshiproom.support.AbstractDataJpaTest;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.jdbc.core.JdbcTemplate;

import static org.assertj.core.api.Assertions.assertThat;

class QotdQuestionRepositoryTest extends AbstractDataJpaTest {

    @Autowired private QotdQuestionRepository repo;
    @Autowired private JdbcTemplate jdbc;

    @Test
    void findByDisplayOrderAndIsActiveTrue_returnsRowWhenActive() {
        // Test profile inherits the new prod seed (no context filter) so all 72 rows are present.
        // Display order 0 => "qotd-1" (faith_journey).
        Optional<QotdQuestion> found = repo.findByDisplayOrderAndIsActiveTrue(0);

        assertThat(found).isPresent();
        assertThat(found.get().getId()).isEqualTo("qotd-1");
        assertThat(found.get().getTheme()).isEqualTo("faith_journey");
        assertThat(found.get().isActive()).isTrue();
    }

    @Test
    void findByDisplayOrderAndIsActiveTrue_returnsEmptyWhenInactive() {
        // Toggle qotd-1 (display_order=0) to is_active=false and re-query.
        // @DataJpaTest wraps this in a transaction that rolls back; no cleanup needed.
        jdbc.update("UPDATE qotd_questions SET is_active = false WHERE id = 'qotd-1'");

        Optional<QotdQuestion> found = repo.findByDisplayOrderAndIsActiveTrue(0);

        assertThat(found).isEmpty();
    }
}
