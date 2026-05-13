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
import com.worshiproom.user.DisplayNameResolver;
import com.worshiproom.user.User;
import com.worshiproom.user.UserRepository;
import jakarta.annotation.Nullable;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.HashMap;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;

/**
 * Spec 6.5 — builds the Intercessor Timeline visible to any authorized viewer.
 *
 * <p><b>Parallel reader to 6.1 PrayerReceiptService, NOT a wrapper</b>
 * (D-PrivacyContrast). They share the {@code post_reactions} table and the
 * {@link DisplayNameResolver}, but they apply DIFFERENT privacy filters:
 *
 * <table>
 *   <tr><th>Concern</th><th>6.1 PrayerReceipt</th><th>6.5 Intercessor</th></tr>
 *   <tr><td>Viewer</td><td>Post author</td><td>Any authorized viewer</td></tr>
 *   <tr><td>Anonymous criterion</td><td>Not author's friend</td><td>Not VIEWER's friend</td></tr>
 *   <tr><td>Response shape</td><td>totalCount + attributed[] + anonymousCount</td>
 *       <td>entries[] (mixed named + anonymous) + totalCount</td></tr>
 *   <tr><td>userId on wire</td><td>Only for author's friends</td>
 *       <td>Only for viewer's friends</td></tr>
 * </table>
 *
 * <p><b>Caller contract:</b> the caller (controller) MUST have already
 * verified the viewer is authenticated. {@link #buildTimeline} re-checks
 * post visibility via {@link PostSpecifications#visibleTo} BEFORE fetching
 * reactions — failed visibility check throws {@link PostNotFoundException}.
 *
 * <p><b>Special case:</b> if the viewer themselves is in the reactor list,
 * the entry shows the viewer's own display name regardless of friend
 * classification (a user always sees their own reaction by name).
 *
 * <p><b>Logging discipline (W6):</b> if a reactor resolves to Anonymous, the
 * service does NOT log {@code userId} at any level. Aggregate counts only.
 */
@Service
public class IntercessorService {

    private static final String PRAYING_REACTION_TYPE = "praying";
    private static final int TIMELINE_CAP = 50;
    private static final int FEED_FIRST_THREE_CAP = 3;

    private final PostRepository postRepository;
    private final ReactionRepository reactionRepository;
    private final FriendRelationshipRepository friendRepository;
    private final UserRepository userRepository;

    public IntercessorService(
            PostRepository postRepository,
            ReactionRepository reactionRepository,
            FriendRelationshipRepository friendRepository,
            UserRepository userRepository) {
        this.postRepository = postRepository;
        this.reactionRepository = reactionRepository;
        this.friendRepository = friendRepository;
        this.userRepository = userRepository;
    }

    /**
     * Build the Intercessor Timeline for a post visible to {@code viewerId}.
     *
     * <p>Throws {@link PostNotFoundException} when:
     * <ul>
     *   <li>Post does not exist</li>
     *   <li>Post is soft-deleted or moderation-hidden</li>
     *   <li>Post's visibility prevents this viewer from seeing it</li>
     * </ul>
     * All three cases map to 404 (don't leak existence).
     */
    @Transactional(readOnly = true)
    public IntercessorResponse buildTimeline(UUID postId, UUID viewerId) {
        Specification<Post> spec = PostSpecifications.visibleTo(viewerId)
                .and((root, query, cb) -> cb.equal(root.get("id"), postId));
        Post post = postRepository.findOne(spec).orElseThrow(PostNotFoundException::new);

        long totalCount = post.getPrayingCount();

        List<PostReaction> reactions = reactionRepository
                .findByPostIdAndReactionTypeOrderByCreatedAtDescUserIdAsc(
                        postId, PRAYING_REACTION_TYPE, PageRequest.of(0, TIMELINE_CAP));

        Set<UUID> viewerFriendIds = loadViewerFriends(viewerId);
        Map<UUID, User> reactorUsers = loadReactorUsers(reactions);

        List<IntercessorEntry> entries = reactions.stream()
                .map(r -> classifyEntry(r, viewerId, viewerFriendIds, reactorUsers))
                .toList();

        return new IntercessorResponse(entries, totalCount);
    }

    /**
     * Build the inline summaries for a page of posts (feed endpoint).
     *
     * <p>One window-function query for all top-3 reactions across the page.
     * One friends query for the viewer. One user-records batch for the union
     * of all reactor IDs. Returns a Map keyed by postId; PostMapper merges into
     * the per-post PostDto.
     *
     * <p>Posts with 0 reactions are present in the map as
     * {@code IntercessorSummary(0, List.of())}.
     *
     * <p>Null viewer runs the SAME classifier with empty self + empty friend set.
     * Every reactor classifies as Anonymous; no second code path, no risk of
     * the firstThree-empty-but-count-non-zero shape that would crash
     * {@code formatSummaryLine} on the client.
     */
    @Transactional(readOnly = true)
    public Map<UUID, IntercessorSummary> buildFeedSummaries(List<Post> posts, @Nullable UUID viewerId) {
        if (posts.isEmpty()) {
            return Map.of();
        }
        List<UUID> postIds = posts.stream().map(Post::getId).toList();

        List<ReactionTopProjection> topProjections = reactionRepository
                .findTopNPerPost(postIds, PRAYING_REACTION_TYPE, FEED_FIRST_THREE_CAP);

        Map<UUID, List<ReactionTopProjection>> byPost = topProjections.stream()
                .collect(Collectors.groupingBy(
                        ReactionTopProjection::getPostId,
                        LinkedHashMap::new,
                        Collectors.toList()));

        Set<UUID> viewerFriendIds = viewerId != null ? loadViewerFriends(viewerId) : Set.of();
        Set<UUID> allReactorIds = topProjections.stream()
                .map(ReactionTopProjection::getUserId)
                .collect(Collectors.toCollection(HashSet::new));
        Map<UUID, User> reactorUsers = allReactorIds.isEmpty()
                ? Map.of()
                : userRepository.findAllById(allReactorIds).stream()
                        .filter(u -> !u.isDeleted() && !u.isBanned())
                        .collect(Collectors.toMap(User::getId, u -> u));

        Map<UUID, IntercessorSummary> result = new HashMap<>(posts.size());
        for (Post p : posts) {
            List<ReactionTopProjection> postReactions = byPost.getOrDefault(p.getId(), List.of());
            List<IntercessorEntry> firstThree = postReactions.stream()
                    .map(proj -> classifyFromProjection(proj, viewerId, viewerFriendIds, reactorUsers))
                    .toList();
            result.put(p.getId(), new IntercessorSummary(p.getPrayingCount(), firstThree));
        }
        return result;
    }

    // === helpers ===

    private Set<UUID> loadViewerFriends(UUID viewerId) {
        return friendRepository
                .findAllByUserIdAndStatus(viewerId, FriendRelationshipStatus.ACTIVE)
                .stream()
                .map(FriendRelationship::getFriendUserId)
                .collect(Collectors.toCollection(HashSet::new));
    }

    private Map<UUID, User> loadReactorUsers(List<PostReaction> reactions) {
        Set<UUID> reactorIds = reactions.stream()
                .map(PostReaction::getUserId)
                .collect(Collectors.toCollection(HashSet::new));
        if (reactorIds.isEmpty()) return Map.of();
        return userRepository.findAllById(reactorIds).stream()
                .filter(u -> !u.isDeleted() && !u.isBanned())
                .collect(Collectors.toMap(User::getId, u -> u));
    }

    private IntercessorEntry classifyEntry(
            PostReaction reaction, UUID viewerId,
            Set<UUID> viewerFriendIds, Map<UUID, User> reactorUsers) {

        UUID reactorId = reaction.getUserId();
        boolean isSelf = reactorId.equals(viewerId);
        boolean isFriend = viewerFriendIds.contains(reactorId);
        User user = reactorUsers.get(reactorId);

        if (user == null) {
            return IntercessorEntry.anonymous(reaction.getCreatedAt());
        }
        if (isSelf || isFriend) {
            String name = DisplayNameResolver.resolve(user);
            return IntercessorEntry.named(reactorId, name, reaction.getCreatedAt());
        }
        return IntercessorEntry.anonymous(reaction.getCreatedAt());
    }

    private IntercessorEntry classifyFromProjection(
            ReactionTopProjection proj, @Nullable UUID viewerId,
            Set<UUID> viewerFriendIds, Map<UUID, User> reactorUsers) {

        UUID reactorId = proj.getUserId();
        boolean isSelf = viewerId != null && reactorId.equals(viewerId);
        boolean isFriend = viewerFriendIds.contains(reactorId);
        User user = reactorUsers.get(reactorId);
        OffsetDateTime reactedAt = proj.getCreatedAt().atOffset(ZoneOffset.UTC);

        if (user == null) {
            return IntercessorEntry.anonymous(reactedAt);
        }
        if (isSelf || isFriend) {
            return IntercessorEntry.named(reactorId, DisplayNameResolver.resolve(user), reactedAt);
        }
        return IntercessorEntry.anonymous(reactedAt);
    }
}
