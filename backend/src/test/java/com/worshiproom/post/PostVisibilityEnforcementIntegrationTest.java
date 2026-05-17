package com.worshiproom.post;

import com.worshiproom.post.dto.PostDto;
import com.worshiproom.post.dto.PostListResponse;
import com.worshiproom.support.AbstractIntegrationTest;
import com.worshiproom.user.User;
import com.worshiproom.user.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.jdbc.core.JdbcTemplate;

import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/**
 * Spec 7.7 R4 / MPD-6 — Endpoint-layer enforcement audit for the canonical
 * visibility predicate ({@link PostSpecifications#visibleTo(UUID)},
 * defined at master plan line 6521).
 *
 * <p>The predicate itself is exhaustively covered by
 * {@link PostSpecificationsTest}; this test class verifies that the principal
 * read services compose the predicate correctly, so a future regression
 * (e.g., a service method dropping {@code .and(visibleTo(...))}) fails a
 * test rather than shipping silently.
 *
 * <p>Endpoints exercised:
 * <ul>
 *   <li>{@link PostService#listFeed} — main feed</li>
 *   <li>{@link PostService#getById} — single post detail</li>
 *   <li>{@link PostService#listAuthorPosts} — author profile feed</li>
 *   <li>{@link FriendPrayersService#listFriendPrayersToday} — Daily Hub friend prayers</li>
 * </ul>
 *
 * <p>Posts are seeded via raw JdbcTemplate INSERT (canonical pattern from
 * {@code FriendPrayersServiceTest:46}) so the test focuses on read-path
 * predicate composition, not write-path scaffolding.
 */
class PostVisibilityEnforcementIntegrationTest extends AbstractIntegrationTest {

    @Autowired private PostService postService;
    @Autowired private FriendPrayersService friendPrayersService;
    @Autowired private PostRepository postRepository;
    @Autowired private UserRepository userRepository;
    @Autowired private JdbcTemplate jdbc;

    private User author;
    private User friend;
    private User stranger;

    @BeforeEach
    void clean() {
        // Order matters: child tables before users.
        jdbc.update("DELETE FROM quick_lift_sessions");
        jdbc.update("DELETE FROM user_mutes");
        jdbc.update("DELETE FROM friend_relationships");
        postRepository.deleteAll();
        userRepository.deleteAll();

        author = userRepository.saveAndFlush(uniqueUser("author"));
        friend = userRepository.saveAndFlush(uniqueUser("friend"));
        stranger = userRepository.saveAndFlush(uniqueUser("stranger"));

        // Canonical direction (master plan line 6510-6513):
        //   fr.user_id = post.user_id (author) AND fr.friend_user_id = viewer (friend) AND status = ACTIVE.
        // The reversed direction is exercised separately in friendDirectionReversal_doesNotLeakViaListFeed.
        seedFriendship(author.getId(), friend.getId());
    }

    private static User uniqueUser(String tag) {
        return new User(
                tag + "-" + UUID.randomUUID().toString().substring(0, 8) + "@test.local",
                "$2a$10$placeholderplaceholderplaceholderplaceholderplaceholder",
                tag.substring(0, 1).toUpperCase() + tag.substring(1), "Test", "UTC");
    }

    private void seedFriendship(UUID userId, UUID friendUserId) {
        jdbc.update("""
                INSERT INTO friend_relationships (user_id, friend_user_id, status)
                VALUES (?, ?, 'active')
                """, userId, friendUserId);
    }

    /**
     * Seed a prayer_request post for the given author with explicit visibility.
     * created_at / last_activity_at set to NOW so the post satisfies the
     * {@link FriendPrayersService} 24h window.
     */
    private UUID seedPost(UUID authorId, String visibility) {
        UUID id = UUID.randomUUID();
        OffsetDateTime now = OffsetDateTime.now(ZoneOffset.UTC);
        jdbc.update("""
                INSERT INTO posts (id, user_id, post_type, content, visibility, moderation_status,
                                   created_at, updated_at, last_activity_at)
                VALUES (?, ?, 'prayer_request', 'visibility-test content', ?, 'approved',
                        ?, ?, ?)
                """, id, authorId, visibility, now, now, now);
        return id;
    }

    // =====================================================================
    // listFeed — endpoint-layer composition of visibleTo
    // =====================================================================

    @Nested
    class ListFeed {

        @Test
        void listFeed_publicVisibleToAll() {
            UUID publicPostId = seedPost(author.getId(), "public");

            assertThat(idsOf(listFeed(null))).contains(publicPostId);
            assertThat(idsOf(listFeed(friend.getId()))).contains(publicPostId);
            assertThat(idsOf(listFeed(stranger.getId()))).contains(publicPostId);
            assertThat(idsOf(listFeed(author.getId()))).contains(publicPostId);
        }

        @Test
        void listFeed_friendsVisibleOnlyToFriendsAndAuthor() {
            UUID friendsPostId = seedPost(author.getId(), "friends");

            // Friend (active relationship author -> friend) sees the post.
            assertThat(idsOf(listFeed(friend.getId()))).contains(friendsPostId);
            // Author always sees their own post regardless of tier.
            assertThat(idsOf(listFeed(author.getId()))).contains(friendsPostId);
            // Stranger has no friend relationship — must NOT see.
            assertThat(idsOf(listFeed(stranger.getId()))).doesNotContain(friendsPostId);
            // Anonymous viewer must NOT see friends-tier posts.
            assertThat(idsOf(listFeed(null))).doesNotContain(friendsPostId);
        }

        @Test
        void listFeed_privateVisibleOnlyToAuthor() {
            UUID privatePostId = seedPost(author.getId(), "private");

            // Author sees their own private post.
            assertThat(idsOf(listFeed(author.getId()))).contains(privatePostId);
            // Friend (with active relationship) must NOT see private.
            assertThat(idsOf(listFeed(friend.getId()))).doesNotContain(privatePostId);
            // Stranger must NOT see.
            assertThat(idsOf(listFeed(stranger.getId()))).doesNotContain(privatePostId);
            // Anonymous must NOT see.
            assertThat(idsOf(listFeed(null))).doesNotContain(privatePostId);
        }
    }

    // =====================================================================
    // getById — endpoint-layer composition of visibleTo (404 on invisible)
    // =====================================================================

    @Nested
    class GetById {

        @Test
        void getById_friendsHiddenFromStranger() {
            UUID friendsPostId = seedPost(author.getId(), "friends");
            assertThatThrownBy(() -> postService.getById(friendsPostId, stranger.getId()))
                    .isInstanceOf(PostNotFoundException.class);
            // Anonymous viewer also gets 404 for friends-tier posts.
            assertThatThrownBy(() -> postService.getById(friendsPostId, null))
                    .isInstanceOf(PostNotFoundException.class);
        }

        @Test
        void getById_privateHiddenFromFriend() {
            UUID privatePostId = seedPost(author.getId(), "private");
            // Friend with active relationship still cannot see private posts.
            assertThatThrownBy(() -> postService.getById(privatePostId, friend.getId()))
                    .isInstanceOf(PostNotFoundException.class);
            // Stranger cannot see.
            assertThatThrownBy(() -> postService.getById(privatePostId, stranger.getId()))
                    .isInstanceOf(PostNotFoundException.class);
            // Anonymous cannot see.
            assertThatThrownBy(() -> postService.getById(privatePostId, null))
                    .isInstanceOf(PostNotFoundException.class);
        }

        @Test
        void getById_authorAlwaysVisible() {
            UUID publicPostId = seedPost(author.getId(), "public");
            UUID friendsPostId = seedPost(author.getId(), "friends");
            UUID privatePostId = seedPost(author.getId(), "private");

            // Author can fetch every tier of their own post.
            assertThat(postService.getById(publicPostId, author.getId()).id()).isEqualTo(publicPostId);
            assertThat(postService.getById(friendsPostId, author.getId()).id()).isEqualTo(friendsPostId);
            assertThat(postService.getById(privatePostId, author.getId()).id()).isEqualTo(privatePostId);
        }
    }

    // =====================================================================
    // listAuthorPosts — endpoint-layer composition of visibleTo
    // =====================================================================

    @Nested
    class ListAuthorPosts {

        @Test
        void listAuthorPosts_filtersByVisibility() {
            UUID publicPostId = seedPost(author.getId(), "public");
            UUID friendsPostId = seedPost(author.getId(), "friends");
            UUID privatePostId = seedPost(author.getId(), "private");

            // Friend sees PUBLIC + FRIENDS, not PRIVATE.
            PostListResponse asFriend = postService.listAuthorPosts(
                    author.getId().toString(), friend.getId(), 1, 20,
                    PostService.SortKey.RECENT, "req-friend");
            assertThat(idsOf(asFriend))
                    .contains(publicPostId, friendsPostId)
                    .doesNotContain(privatePostId);

            // Stranger sees PUBLIC only.
            PostListResponse asStranger = postService.listAuthorPosts(
                    author.getId().toString(), stranger.getId(), 1, 20,
                    PostService.SortKey.RECENT, "req-stranger");
            assertThat(idsOf(asStranger))
                    .contains(publicPostId)
                    .doesNotContain(friendsPostId, privatePostId);

            // Anonymous sees PUBLIC only.
            PostListResponse asAnon = postService.listAuthorPosts(
                    author.getId().toString(), null, 1, 20,
                    PostService.SortKey.RECENT, "req-anon");
            assertThat(idsOf(asAnon))
                    .contains(publicPostId)
                    .doesNotContain(friendsPostId, privatePostId);

            // Author sees all three tiers of their own posts.
            PostListResponse asAuthor = postService.listAuthorPosts(
                    author.getId().toString(), author.getId(), 1, 20,
                    PostService.SortKey.RECENT, "req-author");
            assertThat(idsOf(asAuthor))
                    .contains(publicPostId, friendsPostId, privatePostId);
        }
    }

    // =====================================================================
    // FriendPrayersService — endpoint-layer composition (visibility AND friendship)
    // =====================================================================

    @Nested
    class FriendPrayersToday {

        @Test
        void friendPrayersToday_excludesPrivatePosts() {
            // author -> friend relationship already seeded in @BeforeEach.
            UUID friendsPostId = seedPost(author.getId(), "friends");
            UUID privatePostId = seedPost(author.getId(), "private");

            PostListResponse resp = friendPrayersService.listFriendPrayersToday(
                    friend.getId(), "req-friend-today");

            // FRIENDS-tier post is included (active friendship + visible to viewer).
            // PRIVATE-tier post is excluded because visibleTo only matches author=viewerId.
            assertThat(idsOf(resp))
                    .contains(friendsPostId)
                    .doesNotContain(privatePostId);
        }

        @Test
        void friendPrayersToday_excludesPublicFromNonFriends() {
            // Author creates a PUBLIC post. Stranger has NO friendship to author.
            // byActiveFriendsOf(stranger) matches no posts even when visibility is PUBLIC.
            seedPost(author.getId(), "public");

            PostListResponse resp = friendPrayersService.listFriendPrayersToday(
                    stranger.getId(), "req-stranger-today");

            assertThat(resp.data()).isEmpty();
        }
    }

    // =====================================================================
    // Friend-direction reversal defense at the endpoint layer
    // =====================================================================

    @Test
    void friendDirectionReversal_doesNotLeakViaListFeed() {
        // Wipe the canonical direction seeded in @BeforeEach and seed the REVERSED row.
        jdbc.update("DELETE FROM friend_relationships");
        // REVERSED: fr.user_id = friend (viewer), fr.friend_user_id = author (post owner).
        // The predicate requires fr.user_id = post.user_id (the author), so this row
        // must NOT match. Endpoint-layer regression guard for the direction-reversal
        // bug class — sibling to PostSpecificationsTest.authenticated_doesNotSeeFriendsPostsWhenRelationshipReversed.
        seedFriendship(friend.getId(), author.getId());

        UUID friendsPostId = seedPost(author.getId(), "friends");

        assertThat(idsOf(listFeed(friend.getId()))).doesNotContain(friendsPostId);
    }

    // ────────── helpers ──────────

    private PostListResponse listFeed(UUID viewerId) {
        return postService.listFeed(
                viewerId, 1, 20, null, null, null,
                PostService.SortKey.RECENT, "req-feed");
    }

    private static java.util.List<UUID> idsOf(PostListResponse resp) {
        return resp.data().stream().map(PostDto::id).toList();
    }
}
