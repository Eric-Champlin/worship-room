package com.worshiproom.post.engagement;

import com.worshiproom.activity.ActivityLogRepository;
import com.worshiproom.post.PostRepository;
import com.worshiproom.support.AbstractIntegrationTest;
import com.worshiproom.user.User;
import com.worshiproom.user.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.jdbc.core.JdbcTemplate;

import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Spec 3.7 — service-layer integration tests for {@link BookmarkWriteService}.
 * Asserts idempotent add/remove behavior and that bookmarks NEVER fire activity events.
 */
class BookmarkWriteServiceTest extends AbstractIntegrationTest {

    @Autowired private BookmarkWriteService service;
    @Autowired private PostRepository postRepository;
    @Autowired private BookmarkRepository bookmarkRepository;
    @Autowired private UserRepository userRepository;
    @Autowired private ActivityLogRepository activityLogRepository;
    @Autowired private JdbcTemplate jdbc;

    private User alice;
    private UUID postId;

    @BeforeEach
    void seed() {
        jdbc.update("DELETE FROM activity_log");
        jdbc.update("DELETE FROM friend_relationships");
        bookmarkRepository.deleteAll();
        postRepository.deleteAll();
        userRepository.deleteAll();
        alice = userRepository.saveAndFlush(new User(
                "alice-bm-" + UUID.randomUUID().toString().substring(0, 8) + "@test.local",
                "$2a$10$x", "Alice", "A", "UTC"));
        postId = UUID.randomUUID();
        jdbc.update("""
                INSERT INTO posts (id, user_id, post_type, content, visibility, moderation_status,
                                   is_deleted)
                VALUES (?, ?, 'prayer_request', 'bm test', 'public', 'approved', FALSE)
                """, postId, alice.getId());
    }

    @Test
    void add_whenAbsent_insertsRowAndReturnsCreated201() {
        BookmarkWriteService.AddResult result = service.add(postId, alice.getId(), "req-1");
        assertThat(result.created()).isTrue();
        assertThat(result.response().bookmarked()).isTrue();
        assertThat(result.response().bookmarkCount()).isEqualTo(1);
        assertThat(bookmarkRepository.existsByPostIdAndUserId(postId, alice.getId())).isTrue();
        // Bookmarks NEVER fire activity (Watch-For #13).
        assertThat(activityLogRepository.count()).isZero();
    }

    @Test
    void add_whenAlreadyPresent_isIdempotentReturnsCreatedFalse() {
        service.add(postId, alice.getId(), "req-1");
        BookmarkWriteService.AddResult second = service.add(postId, alice.getId(), "req-2");
        assertThat(second.created()).isFalse();
        assertThat(second.response().bookmarked()).isTrue();
        assertThat(second.response().bookmarkCount()).isEqualTo(1);  // NOT 2
    }

    @Test
    void remove_isIdempotent_whetherRowExistsOrNot() {
        service.remove(postId, alice.getId(), "req-1");  // first remove — no row
        service.add(postId, alice.getId(), "req-2");
        service.remove(postId, alice.getId(), "req-3");  // second remove — was added
        service.remove(postId, alice.getId(), "req-4");  // third remove — already gone
        assertThat(bookmarkRepository.existsByPostIdAndUserId(postId, alice.getId())).isFalse();
        assertThat(activityLogRepository.count()).isZero();  // never fires
    }
}
