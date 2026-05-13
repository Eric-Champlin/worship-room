package com.worshiproom.post;

import com.worshiproom.friends.FriendRelationship;
import com.worshiproom.friends.FriendRelationshipRepository;
import com.worshiproom.friends.FriendRelationshipStatus;
import com.worshiproom.post.dto.IntercessorEntry;
import com.worshiproom.post.dto.IntercessorResponse;
import com.worshiproom.post.dto.IntercessorSummary;
import com.worshiproom.post.engagement.PostReaction;
import com.worshiproom.post.engagement.ReactionRepository;
import com.worshiproom.post.engagement.ReactionTopProjection;
import com.worshiproom.user.User;
import com.worshiproom.user.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;

import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.when;

/**
 * Spec 6.5 — unit tests for {@link IntercessorService} with mocked repos.
 *
 * <p><b>Privacy model under test (Plan-Time Divergence §1):</b> reactors
 * classify as named or anonymous based on the VIEWER's friend set. The
 * service does NOT read any user-level anonymity preference (no such
 * column exists).
 */
@ExtendWith(MockitoExtension.class)
class IntercessorServiceTest {

    @Mock private PostRepository postRepository;
    @Mock private ReactionRepository reactionRepository;
    @Mock private FriendRelationshipRepository friendRepository;
    @Mock private UserRepository userRepository;

    private IntercessorService service;

    private final OffsetDateTime now = OffsetDateTime.of(2026, 5, 13, 12, 0, 0, 0, ZoneOffset.UTC);

    @BeforeEach
    void setUp() {
        service = new IntercessorService(postRepository, reactionRepository,
                friendRepository, userRepository);
    }

    private User buildUser(UUID id, String first, String last) {
        User u = new User("u-" + id + "@test", "$2a$10$x", first, last, "UTC");
        // Set the id reflectively since User PK is auto-assigned at persist time.
        try {
            java.lang.reflect.Field f = User.class.getDeclaredField("id");
            f.setAccessible(true);
            f.set(u, id);
        } catch (Exception e) {
            throw new RuntimeException(e);
        }
        return u;
    }

    private Post buildPost(UUID id, UUID authorId, int prayingCount) {
        Post p = new Post();
        p.setId(id);
        p.setUserId(authorId);
        p.setPrayingCount(prayingCount);
        return p;
    }

    private PostReaction reaction(UUID postId, UUID userId, OffsetDateTime at) {
        PostReaction r = new PostReaction(postId, userId, "praying");
        try {
            java.lang.reflect.Field f = PostReaction.class.getDeclaredField("createdAt");
            f.setAccessible(true);
            f.set(r, at);
        } catch (Exception e) {
            throw new RuntimeException(e);
        }
        return r;
    }

    @Test
    void buildTimeline_visibilityDenied_throwsPostNotFound() {
        UUID postId = UUID.randomUUID();
        UUID viewer = UUID.randomUUID();
        when(postRepository.findOne(any(Specification.class))).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.buildTimeline(postId, viewer))
                .isInstanceOf(PostNotFoundException.class);
    }

    @Test
    void buildTimeline_classifiesFriendVsNonFriendAndSelf() {
        UUID postId = UUID.randomUUID();
        UUID viewerId = UUID.randomUUID();
        UUID friendId = UUID.randomUUID();
        UUID strangerId = UUID.randomUUID();

        Post post = buildPost(postId, UUID.randomUUID(), 3);
        when(postRepository.findOne(any(Specification.class))).thenReturn(Optional.of(post));

        List<PostReaction> reactions = List.of(
                reaction(postId, friendId, now),
                reaction(postId, strangerId, now.minusMinutes(5)),
                reaction(postId, viewerId, now.minusMinutes(10))
        );
        when(reactionRepository.findByPostIdAndReactionTypeOrderByCreatedAtDescUserIdAsc(
                eq(postId), eq("praying"), any(Pageable.class))).thenReturn(reactions);

        when(friendRepository.findAllByUserIdAndStatus(viewerId, FriendRelationshipStatus.ACTIVE))
                .thenReturn(List.of(new FriendRelationship(viewerId, friendId, FriendRelationshipStatus.ACTIVE)));

        User viewerUser = buildUser(viewerId, "Vera", "Viewer");
        User friendUser = buildUser(friendId, "Fred", "Friend");
        User strangerUser = buildUser(strangerId, "Sam", "Stranger");
        when(userRepository.findAllById(any())).thenReturn(List.of(viewerUser, friendUser, strangerUser));

        IntercessorResponse response = service.buildTimeline(postId, viewerId);

        assertThat(response.totalCount()).isEqualTo(3L);
        assertThat(response.entries()).hasSize(3);

        IntercessorEntry first = response.entries().get(0);
        assertThat(first.isAnonymous()).isFalse();
        assertThat(first.userId()).isEqualTo(friendId);

        IntercessorEntry second = response.entries().get(1);
        assertThat(second.isAnonymous()).isTrue();
        assertThat(second.userId()).isNull();

        IntercessorEntry third = response.entries().get(2);
        assertThat(third.isAnonymous()).isFalse();
        assertThat(third.userId()).isEqualTo(viewerId);
    }

    @Test
    void buildTimeline_deletedReactorBecomesAnonymous() {
        UUID postId = UUID.randomUUID();
        UUID viewerId = UUID.randomUUID();
        UUID friendId = UUID.randomUUID();

        Post post = buildPost(postId, UUID.randomUUID(), 1);
        when(postRepository.findOne(any(Specification.class))).thenReturn(Optional.of(post));
        when(reactionRepository.findByPostIdAndReactionTypeOrderByCreatedAtDescUserIdAsc(
                any(), anyString(), any(Pageable.class)))
                .thenReturn(List.of(reaction(postId, friendId, now)));
        when(friendRepository.findAllByUserIdAndStatus(viewerId, FriendRelationshipStatus.ACTIVE))
                .thenReturn(List.of(new FriendRelationship(viewerId, friendId, FriendRelationshipStatus.ACTIVE)));

        User deletedFriend = buildUser(friendId, "Ghost", "User");
        deletedFriend.setDeleted(true);
        // findAllById filtered by !isDeleted in the service → friend missing from map
        when(userRepository.findAllById(any())).thenReturn(List.of(deletedFriend));

        IntercessorResponse response = service.buildTimeline(postId, viewerId);

        assertThat(response.entries()).hasSize(1);
        IntercessorEntry entry = response.entries().get(0);
        assertThat(entry.isAnonymous()).isTrue();
        assertThat(entry.userId()).isNull();
    }

    @Test
    void buildFeedSummaries_emptyPostList_returnsEmptyMap() {
        Map<UUID, IntercessorSummary> result = service.buildFeedSummaries(List.of(), UUID.randomUUID());
        assertThat(result).isEmpty();
    }

    @Test
    void buildFeedSummaries_postWithZeroReactions_returnsCountZeroAndEmptyFirstThree() {
        UUID postId = UUID.randomUUID();
        Post post = buildPost(postId, UUID.randomUUID(), 0);

        when(reactionRepository.findTopNPerPost(any(), anyString(), anyInt())).thenReturn(List.of());
        lenient().when(friendRepository.findAllByUserIdAndStatus(any(), any()))
                .thenReturn(List.of());

        Map<UUID, IntercessorSummary> result = service.buildFeedSummaries(List.of(post), UUID.randomUUID());
        assertThat(result).containsOnlyKeys(postId);
        IntercessorSummary summary = result.get(postId);
        assertThat(summary.count()).isEqualTo(0L);
        assertThat(summary.firstThree()).isEmpty();
    }

    @Test
    void buildFeedSummaries_classifiesFirstThreeAgainstViewerFriends() {
        UUID postId = UUID.randomUUID();
        UUID viewerId = UUID.randomUUID();
        UUID friendId = UUID.randomUUID();
        UUID strangerId = UUID.randomUUID();
        Post post = buildPost(postId, UUID.randomUUID(), 5);

        ReactionTopProjection p1 = projection(postId, friendId, now);
        ReactionTopProjection p2 = projection(postId, strangerId, now.minusMinutes(1));
        ReactionTopProjection p3 = projection(postId, viewerId, now.minusMinutes(2));
        when(reactionRepository.findTopNPerPost(any(), anyString(), anyInt()))
                .thenReturn(List.of(p1, p2, p3));

        when(friendRepository.findAllByUserIdAndStatus(viewerId, FriendRelationshipStatus.ACTIVE))
                .thenReturn(List.of(new FriendRelationship(viewerId, friendId, FriendRelationshipStatus.ACTIVE)));

        User viewerUser = buildUser(viewerId, "Vera", "Viewer");
        User friendUser = buildUser(friendId, "Fred", "Friend");
        User strangerUser = buildUser(strangerId, "Sam", "Stranger");
        when(userRepository.findAllById(any())).thenReturn(List.of(viewerUser, friendUser, strangerUser));

        Map<UUID, IntercessorSummary> result = service.buildFeedSummaries(List.of(post), viewerId);

        IntercessorSummary summary = result.get(postId);
        assertThat(summary.count()).isEqualTo(5L);
        assertThat(summary.firstThree()).hasSize(3);

        assertThat(summary.firstThree().get(0).isAnonymous()).isFalse();
        assertThat(summary.firstThree().get(0).userId()).isEqualTo(friendId);
        assertThat(summary.firstThree().get(1).isAnonymous()).isTrue();
        assertThat(summary.firstThree().get(1).userId()).isNull();
        assertThat(summary.firstThree().get(2).isAnonymous()).isFalse();
        assertThat(summary.firstThree().get(2).userId()).isEqualTo(viewerId);
    }

    @Test
    void buildFeedSummaries_nullViewer_allReactorsAreAnonymous() {
        UUID postId = UUID.randomUUID();
        UUID reactorId = UUID.randomUUID();
        Post post = buildPost(postId, UUID.randomUUID(), 1);

        when(reactionRepository.findTopNPerPost(any(), anyString(), anyInt()))
                .thenReturn(List.of(projection(postId, reactorId, now)));
        User reactorUser = buildUser(reactorId, "Someone", "Real");
        when(userRepository.findAllById(any())).thenReturn(List.of(reactorUser));

        Map<UUID, IntercessorSummary> result = service.buildFeedSummaries(List.of(post), null);

        IntercessorSummary summary = result.get(postId);
        assertThat(summary.firstThree()).hasSize(1);
        assertThat(summary.firstThree().get(0).isAnonymous()).isTrue();
        assertThat(summary.firstThree().get(0).userId()).isNull();
    }

    private static ReactionTopProjection projection(UUID postId, UUID userId, OffsetDateTime at) {
        java.time.Instant atInstant = at.toInstant();
        return new ReactionTopProjection() {
            public UUID getPostId() { return postId; }
            public UUID getUserId() { return userId; }
            public java.time.Instant getCreatedAt() { return atInstant; }
        };
    }
}
