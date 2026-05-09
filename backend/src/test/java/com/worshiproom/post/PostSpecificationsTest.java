package com.worshiproom.post;

import com.worshiproom.friends.FriendRelationship;
import com.worshiproom.friends.FriendRelationshipRepository;
import com.worshiproom.friends.FriendRelationshipStatus;
import com.worshiproom.mute.UserMute;
import com.worshiproom.mute.UserMuteRepository;
import com.worshiproom.support.AbstractDataJpaTest;
import com.worshiproom.user.User;
import com.worshiproom.user.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.jdbc.core.JdbcTemplate;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Exhaustive verification of {@link PostSpecifications#visibleTo(UUID)} and
 * {@link PostSpecifications#notMutedBy(UUID)} — the load-bearing correctness
 * concern for Spec 3.3 read endpoints. Each branch of the master plan Spec 7.7
 * canonical predicate gets a dedicated test.
 *
 * <p>Posts are inserted via raw SQL (JdbcTemplate) because the Post entity is
 * intentionally read-only this spec — no setters, no @PrePersist. Direct INSERT
 * also lets us control exact column values (e.g., is_deleted, moderation_status).
 */
class PostSpecificationsTest extends AbstractDataJpaTest {

    @Autowired private PostRepository postRepository;
    @Autowired private UserRepository userRepository;
    @Autowired private FriendRelationshipRepository friendRepository;
    @Autowired private UserMuteRepository muteRepository;
    @Autowired private JdbcTemplate jdbc;

    private User author;
    private User viewer;
    private User stranger;

    @BeforeEach
    void seedBaseUsers() {
        // saveAndFlush so the user rows exist in the DB before JdbcTemplate INSERTs reference them
        author = userRepository.saveAndFlush(uniqueUser("author"));
        viewer = userRepository.saveAndFlush(uniqueUser("viewer"));
        stranger = userRepository.saveAndFlush(uniqueUser("stranger"));
    }

    private static User uniqueUser(String label) {
        String stamp = UUID.randomUUID().toString().substring(0, 8);
        return new User(
                label + "-" + stamp + "@test.local",
                "$2a$10$placeholderplaceholderplaceholderplaceholderplaceholder",
                capitalize(label),
                "User",
                "UTC"
        );
    }

    private static String capitalize(String s) {
        return Character.toUpperCase(s.charAt(0)) + s.substring(1);
    }

    private UUID seedPost(UUID userId, PostVisibility visibility, ModerationStatus status, boolean deleted) {
        UUID id = UUID.randomUUID();
        jdbc.update("""
                INSERT INTO posts (
                    id, user_id, post_type, content,
                    visibility, moderation_status, is_deleted, deleted_at
                ) VALUES (?, ?, 'prayer_request', 'test content',
                    ?, ?, ?, ?)
                """,
                id, userId,
                visibility.value(), status.value(),
                deleted, deleted ? OffsetDateTime.now() : null);
        return id;
    }

    // ---------- Unauthenticated viewer ----------

    @Test
    void unauthenticated_seesPublicApprovedPosts() {
        UUID postId = seedPost(author.getId(), PostVisibility.PUBLIC, ModerationStatus.APPROVED, false);
        List<Post> visible = postRepository.findAll(PostSpecifications.visibleTo(null));
        assertThat(visible).extracting(Post::getId).contains(postId);
    }

    @Test
    void unauthenticated_doesNotSeeFriendsVisibilityPosts() {
        UUID postId = seedPost(author.getId(), PostVisibility.FRIENDS, ModerationStatus.APPROVED, false);
        List<Post> visible = postRepository.findAll(PostSpecifications.visibleTo(null));
        assertThat(visible).extracting(Post::getId).doesNotContain(postId);
    }

    @Test
    void unauthenticated_doesNotSeePrivatePosts() {
        UUID postId = seedPost(author.getId(), PostVisibility.PRIVATE, ModerationStatus.APPROVED, false);
        List<Post> visible = postRepository.findAll(PostSpecifications.visibleTo(null));
        assertThat(visible).extracting(Post::getId).doesNotContain(postId);
    }

    @Test
    void unauthenticated_doesNotSeeSoftDeletedPosts() {
        UUID postId = seedPost(author.getId(), PostVisibility.PUBLIC, ModerationStatus.APPROVED, true);
        List<Post> visible = postRepository.findAll(PostSpecifications.visibleTo(null));
        assertThat(visible).extracting(Post::getId).doesNotContain(postId);
    }

    @Test
    void unauthenticated_doesNotSeeHiddenModerationStatus() {
        UUID postId = seedPost(author.getId(), PostVisibility.PUBLIC, ModerationStatus.HIDDEN, false);
        List<Post> visible = postRepository.findAll(PostSpecifications.visibleTo(null));
        assertThat(visible).extracting(Post::getId).doesNotContain(postId);
    }

    @Test
    void unauthenticated_doesNotSeeRemovedModerationStatus() {
        UUID postId = seedPost(author.getId(), PostVisibility.PUBLIC, ModerationStatus.REMOVED, false);
        List<Post> visible = postRepository.findAll(PostSpecifications.visibleTo(null));
        assertThat(visible).extracting(Post::getId).doesNotContain(postId);
    }

    @Test
    void unauthenticated_seesFlaggedModerationStatus() {
        UUID postId = seedPost(author.getId(), PostVisibility.PUBLIC, ModerationStatus.FLAGGED, false);
        List<Post> visible = postRepository.findAll(PostSpecifications.visibleTo(null));
        assertThat(visible).extracting(Post::getId).contains(postId);
    }

    // ---------- Authenticated viewer ----------

    @Test
    void authenticated_seesPublicPosts() {
        UUID postId = seedPost(author.getId(), PostVisibility.PUBLIC, ModerationStatus.APPROVED, false);
        List<Post> visible = postRepository.findAll(PostSpecifications.visibleTo(viewer.getId()));
        assertThat(visible).extracting(Post::getId).contains(postId);
    }

    @Test
    void authenticated_seesFriendsPostsWhenActiveFriendRowExists() {
        // canonical direction: fr.user_id = author, fr.friend_user_id = viewer, status = ACTIVE
        friendRepository.saveAndFlush(new FriendRelationship(
                author.getId(), viewer.getId(), FriendRelationshipStatus.ACTIVE));
        UUID postId = seedPost(author.getId(), PostVisibility.FRIENDS, ModerationStatus.APPROVED, false);
        List<Post> visible = postRepository.findAll(PostSpecifications.visibleTo(viewer.getId()));
        assertThat(visible).extracting(Post::getId).contains(postId);
    }

    @Test
    void authenticated_doesNotSeeFriendsPostsWhenNoFriendRow() {
        UUID postId = seedPost(author.getId(), PostVisibility.FRIENDS, ModerationStatus.APPROVED, false);
        List<Post> visible = postRepository.findAll(PostSpecifications.visibleTo(viewer.getId()));
        assertThat(visible).extracting(Post::getId).doesNotContain(postId);
    }

    @Test
    void authenticated_doesNotSeeFriendsPostsWhenStatusBlocked() {
        friendRepository.saveAndFlush(new FriendRelationship(
                author.getId(), viewer.getId(), FriendRelationshipStatus.BLOCKED));
        UUID postId = seedPost(author.getId(), PostVisibility.FRIENDS, ModerationStatus.APPROVED, false);
        List<Post> visible = postRepository.findAll(PostSpecifications.visibleTo(viewer.getId()));
        assertThat(visible).extracting(Post::getId).doesNotContain(postId);
    }

    @Test
    void authenticated_doesNotSeeFriendsPostsWhenRelationshipReversed() {
        // REVERSED direction: fr.user_id = viewer, fr.friend_user_id = author.
        // The predicate requires fr.user_id = post.user_id (the author), so this row
        // should NOT match. Tests defend against the predicate-direction bug class.
        friendRepository.saveAndFlush(new FriendRelationship(
                viewer.getId(), author.getId(), FriendRelationshipStatus.ACTIVE));
        UUID postId = seedPost(author.getId(), PostVisibility.FRIENDS, ModerationStatus.APPROVED, false);
        List<Post> visible = postRepository.findAll(PostSpecifications.visibleTo(viewer.getId()));
        assertThat(visible).extracting(Post::getId).doesNotContain(postId);
    }

    @Test
    void authenticated_seesOwnPrivatePosts() {
        UUID postId = seedPost(viewer.getId(), PostVisibility.PRIVATE, ModerationStatus.APPROVED, false);
        List<Post> visible = postRepository.findAll(PostSpecifications.visibleTo(viewer.getId()));
        assertThat(visible).extracting(Post::getId).contains(postId);
    }

    @Test
    void authenticated_doesNotSeeOthersPrivatePosts() {
        UUID postId = seedPost(author.getId(), PostVisibility.PRIVATE, ModerationStatus.APPROVED, false);
        List<Post> visible = postRepository.findAll(PostSpecifications.visibleTo(viewer.getId()));
        assertThat(visible).extracting(Post::getId).doesNotContain(postId);
    }

    @Test
    void authenticated_seesOwnPosts_regardlessOfVisibility() {
        UUID pub = seedPost(viewer.getId(), PostVisibility.PUBLIC, ModerationStatus.APPROVED, false);
        UUID friends = seedPost(viewer.getId(), PostVisibility.FRIENDS, ModerationStatus.APPROVED, false);
        UUID priv = seedPost(viewer.getId(), PostVisibility.PRIVATE, ModerationStatus.APPROVED, false);
        List<Post> visible = postRepository.findAll(PostSpecifications.visibleTo(viewer.getId()));
        assertThat(visible).extracting(Post::getId).contains(pub, friends, priv);
    }

    // ---------- notMutedBy ----------

    @Test
    void notMutedBy_filtersOutMutedAuthor() {
        muteRepository.saveAndFlush(new UserMute(viewer.getId(), author.getId()));
        UUID mutedAuthorPost = seedPost(author.getId(), PostVisibility.PUBLIC, ModerationStatus.APPROVED, false);
        UUID strangerPost = seedPost(stranger.getId(), PostVisibility.PUBLIC, ModerationStatus.APPROVED, false);

        Specification<Post> spec = PostSpecifications.visibleTo(viewer.getId())
                .and(PostSpecifications.notMutedBy(viewer.getId()));
        List<Post> visible = postRepository.findAll(spec);

        assertThat(visible).extracting(Post::getId)
                .doesNotContain(mutedAuthorPost)
                .contains(strangerPost);
    }

    @Test
    void notMutedBy_unauthenticated_isNoOp() {
        muteRepository.saveAndFlush(new UserMute(viewer.getId(), author.getId()));
        UUID postId = seedPost(author.getId(), PostVisibility.PUBLIC, ModerationStatus.APPROVED, false);
        Specification<Post> spec = PostSpecifications.visibleTo(null)
                .and(PostSpecifications.notMutedBy(null));
        List<Post> visible = postRepository.findAll(spec);
        // Anonymous viewer has no mute relationship; muted author posts still visible.
        assertThat(visible).extracting(Post::getId).contains(postId);
    }

    // ---------- notExpired (Spec 4.6) ----------

    /**
     * Insert a post with explicit post_type and created_at — for the 24h expiry
     * boundary tests. created_at column has DEFAULT NOW() but raw SQL can override it.
     */
    private UUID seedPostWithTypeAndAge(UUID userId, PostType postType, OffsetDateTime createdAt) {
        UUID id = UUID.randomUUID();
        jdbc.update("""
                INSERT INTO posts (
                    id, user_id, post_type, content,
                    visibility, moderation_status, is_deleted, created_at
                ) VALUES (?, ?, ?, 'expiry test',
                    'public', 'approved', false, ?)
                """,
                id, userId, postType.value(), createdAt);
        return id;
    }

    @Test
    void notExpired_excludesEncouragementsOlderThan24Hours() {
        UUID oldEnc = seedPostWithTypeAndAge(author.getId(), PostType.ENCOURAGEMENT,
                OffsetDateTime.now().minusHours(25));
        UUID recentEnc = seedPostWithTypeAndAge(author.getId(), PostType.ENCOURAGEMENT,
                OffsetDateTime.now().minusHours(1));

        List<Post> visible = postRepository.findAll(PostSpecifications.notExpired());

        assertThat(visible).extracting(Post::getId)
                .contains(recentEnc)
                .doesNotContain(oldEnc);
    }

    @Test
    void notExpired_passesNonEncouragementsOfAnyAge() {
        // A 30-day-old prayer_request must still be visible — encouragement-only filter.
        UUID oldPrayer = seedPostWithTypeAndAge(author.getId(), PostType.PRAYER_REQUEST,
                OffsetDateTime.now().minusDays(30));
        UUID oldTestimony = seedPostWithTypeAndAge(author.getId(), PostType.TESTIMONY,
                OffsetDateTime.now().minusDays(60));

        List<Post> visible = postRepository.findAll(PostSpecifications.notExpired());

        assertThat(visible).extracting(Post::getId).contains(oldPrayer, oldTestimony);
    }

    @Test
    void notExpired_passesEncouragementJustUnder24Hours() {
        // 23h 59m old encouragement — `cb.lessThan(createdAt, cutoff)` is strict;
        // createdAt at exactly cutoff would also pass. This test anchors the
        // "recent" boundary at 23h59m to be unambiguous.
        UUID nearCutoff = seedPostWithTypeAndAge(author.getId(), PostType.ENCOURAGEMENT,
                OffsetDateTime.now().minusHours(23).minusMinutes(59));

        List<Post> visible = postRepository.findAll(PostSpecifications.notExpired());

        assertThat(visible).extracting(Post::getId).contains(nearCutoff);
    }

    @Test
    void notExpired_excludesEncouragementJustOver24Hours() {
        // 24h 1m old encouragement — past the cutoff, must be excluded.
        UUID justExpired = seedPostWithTypeAndAge(author.getId(), PostType.ENCOURAGEMENT,
                OffsetDateTime.now().minusHours(24).minusMinutes(1));

        List<Post> visible = postRepository.findAll(PostSpecifications.notExpired());

        assertThat(visible).extracting(Post::getId).doesNotContain(justExpired);
    }
}
