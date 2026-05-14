package com.worshiproom.safety;

import com.worshiproom.post.Post;
import com.worshiproom.post.PostRepository;
import com.worshiproom.post.PostType;
import com.worshiproom.support.AbstractIntegrationTest;
import com.worshiproom.user.User;
import com.worshiproom.user.UserRepository;
import jakarta.persistence.EntityManager;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.transaction.annotation.Transactional;

import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Spec 6.8 — CrisisFlagGate integration test. Exercises the
 * pre-Phase-10 gate's window semantics against real Postgres data.
 *
 * <p>Validates:
 *   - Crisis-flagged post within 48h → gate returns TRUE.
 *   - Crisis-flagged post older than 48h → gate returns FALSE.
 *   - Non-crisis-flagged post within 48h → gate returns FALSE.
 *   - User with no posts → gate returns FALSE.
 */
@Transactional
class CrisisFlagGateTest extends AbstractIntegrationTest {

    @Autowired private CrisisFlagGate gate;
    @Autowired private PostRepository postRepository;
    @Autowired private UserRepository userRepository;
    @Autowired private EntityManager entityManager;

    private UUID userId;

    @BeforeEach
    void seedUser() {
        User user = userRepository.saveAndFlush(
            new User("verse-gate-test+" + UUID.randomUUID() + "@example.com",
                "$2a$10$xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
                "Test", "User", "UTC"));
        userId = user.getId();
    }

    @Test
    @DisplayName("Crisis-flagged post within 48h → gate returns true")
    void recentCrisisFlagTriggers() {
        seedPost(userId, true, OffsetDateTime.now(ZoneOffset.UTC).minusHours(2));
        assertThat(gate.isUserCrisisFlagged(userId)).isTrue();
    }

    @Test
    @DisplayName("Crisis-flagged post older than 48h → gate returns false")
    void oldCrisisFlagDoesNotTrigger() {
        seedPost(userId, true, OffsetDateTime.now(ZoneOffset.UTC).minusHours(49));
        assertThat(gate.isUserCrisisFlagged(userId)).isFalse();
    }

    @Test
    @DisplayName("Non-crisis-flagged post within 48h → gate returns false")
    void nonCrisisPostDoesNotTrigger() {
        seedPost(userId, false, OffsetDateTime.now(ZoneOffset.UTC).minusHours(2));
        assertThat(gate.isUserCrisisFlagged(userId)).isFalse();
    }

    @Test
    @DisplayName("User with no posts → gate returns false")
    void noPostsReturnsFalse() {
        assertThat(gate.isUserCrisisFlagged(userId)).isFalse();
    }

    private void seedPost(UUID author, boolean crisisFlag, OffsetDateTime createdAt) {
        // Direct SQL INSERT bypasses JPA's @CreationTimestamp / DEFAULT NOW()
        // so we can pin a custom created_at — necessary for the 49h boundary test.
        entityManager.createNativeQuery(
            "INSERT INTO posts (id, user_id, post_type, content, category, is_anonymous, "
                + "visibility, is_answered, moderation_status, crisis_flag, is_deleted, "
                + "praying_count, candle_count, comment_count, bookmark_count, report_count, "
                + "praising_count, celebrate_count, created_at, updated_at, last_activity_at) "
                + "VALUES (:id, :userId, 'prayer_request', 'test content', 'mental-health', false, "
                + "'public', false, 'approved', :crisisFlag, false, "
                + "0, 0, 0, 0, 0, 0, 0, :createdAt, :createdAt, :createdAt)")
            .setParameter("id", UUID.randomUUID())
            .setParameter("userId", author)
            .setParameter("crisisFlag", crisisFlag)
            .setParameter("createdAt", createdAt)
            .executeUpdate();
        entityManager.flush();
        entityManager.clear();
    }
}
