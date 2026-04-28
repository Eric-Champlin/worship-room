package com.worshiproom.post.engagement;

import com.worshiproom.activity.ActivityLogRepository;
import com.worshiproom.post.PostNotFoundException;
import com.worshiproom.post.PostRepository;
import com.worshiproom.post.engagement.dto.ToggleReactionResponse;
import com.worshiproom.support.AbstractIntegrationTest;
import com.worshiproom.user.User;
import com.worshiproom.user.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.jdbc.core.JdbcTemplate;

import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/**
 * Spec 3.7 — service-layer integration tests for {@link ReactionWriteService}.
 * Exercises toggle / explicit-remove paths against Testcontainers PostgreSQL via the
 * shared {@link AbstractIntegrationTest} singleton container.
 */
class ReactionWriteServiceTest extends AbstractIntegrationTest {

    @Autowired private ReactionWriteService service;
    @Autowired private PostRepository postRepository;
    @Autowired private ReactionRepository reactionRepository;
    @Autowired private UserRepository userRepository;
    @Autowired private ActivityLogRepository activityLogRepository;
    @Autowired private JdbcTemplate jdbc;

    private User alice;
    private UUID alicePostId;

    @BeforeEach
    void seed() {
        // Cross-test isolation — friend_relationships referenced by visibility predicate;
        // activity_log accumulates from prior INTERCESSION fires.
        jdbc.update("DELETE FROM activity_log");
        jdbc.update("DELETE FROM friend_relationships");
        reactionRepository.deleteAll();
        postRepository.deleteAll();
        userRepository.deleteAll();
        alice = userRepository.saveAndFlush(new User(
                "alice-rxn-" + UUID.randomUUID().toString().substring(0, 8) + "@test.local",
                "$2a$10$x", "Alice", "Anderson", "UTC"));
        alicePostId = seedPost(alice.getId(), "public", false);
    }

    private UUID seedPost(UUID userId, String visibility, boolean deleted) {
        UUID id = UUID.randomUUID();
        jdbc.update("""
                INSERT INTO posts (id, user_id, post_type, content, visibility, moderation_status,
                                   is_deleted, deleted_at)
                VALUES (?, ?, 'prayer_request', 'reaction test', ?, 'approved', ?, ?)
                """, id, userId, visibility, deleted,
                deleted ? java.time.OffsetDateTime.now() : null);
        return id;
    }

    @Test
    void toggle_addPath_insertsRowIncrementsCounterFiresActivity() {
        ToggleReactionResponse r = service.toggle(alicePostId, alice.getId(), "praying", "req-1");
        assertThat(r.state()).isEqualTo("added");
        assertThat(r.prayingCount()).isEqualTo(1);
        assertThat(r.candleCount()).isEqualTo(0);
        assertThat(reactionRepository.existsByPostIdAndUserIdAndReactionType(
                alicePostId, alice.getId(), "praying")).isTrue();
        // Activity row written inside the same transaction.
        assertThat(activityLogRepository.count()).isEqualTo(1);
    }

    @Test
    void toggle_removePath_deletesRowDecrementsCounterDoesNotFireActivity() {
        service.toggle(alicePostId, alice.getId(), "praying", "req-add");
        long activityCountAfterAdd = activityLogRepository.count();

        ToggleReactionResponse r = service.toggle(alicePostId, alice.getId(), "praying", "req-remove");
        assertThat(r.state()).isEqualTo("removed");
        assertThat(r.prayingCount()).isEqualTo(0);
        assertThat(reactionRepository.existsByPostIdAndUserIdAndReactionType(
                alicePostId, alice.getId(), "praying")).isFalse();
        // Remove does NOT fire activity (Watch-For #12).
        assertThat(activityLogRepository.count()).isEqualTo(activityCountAfterAdd);
    }

    @Test
    void toggle_independentTypes_prayingAndCandleAccrueSeparately() {
        service.toggle(alicePostId, alice.getId(), "praying", "req-1");
        ToggleReactionResponse r2 = service.toggle(alicePostId, alice.getId(), "candle", "req-2");
        assertThat(r2.prayingCount()).isEqualTo(1);
        assertThat(r2.candleCount()).isEqualTo(1);
        assertThat(reactionRepository.findAll()).hasSize(2);
    }

    @Test
    void toggle_softDeletedPost_throws404() {
        UUID deletedId = seedPost(alice.getId(), "public", true);
        assertThatThrownBy(() -> service.toggle(deletedId, alice.getId(), "praying", "req"))
                .isInstanceOf(PostNotFoundException.class);
    }

    @Test
    void toggle_privatePostByOtherUser_throws404() {
        User bob = userRepository.saveAndFlush(new User(
                "bob-rxn-" + UUID.randomUUID().toString().substring(0, 8) + "@test.local",
                "$2a$10$x", "Bob", "B", "UTC"));
        UUID privateId = seedPost(bob.getId(), "private", false);
        assertThatThrownBy(() -> service.toggle(privateId, alice.getId(), "praying", "req"))
                .isInstanceOf(PostNotFoundException.class);
    }
}
