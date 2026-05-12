package com.worshiproom.post;

import com.worshiproom.friends.FriendRelationship;
import com.worshiproom.friends.FriendRelationshipRepository;
import com.worshiproom.friends.FriendRelationshipStatus;
import com.worshiproom.post.dto.AttributedIntercessor;
import com.worshiproom.post.dto.PrayerReceiptResponse;
import com.worshiproom.post.engagement.ReactionRepository;
import com.worshiproom.user.DisplayNameResolver;
import com.worshiproom.user.User;
import com.worshiproom.user.UserRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Comparator;
import java.util.HashSet;
import java.util.List;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;

/**
 * Spec 6.1 — builds the author-only Prayer Receipt response.
 *
 * <p><b>Caller contract:</b> The caller (controller) MUST verify
 * {@code requester.userId == post.userId} before invoking this service.
 * The service does NOT re-check authorization — that's the controller's
 * job, executed BEFORE the {@code @Cacheable} lookup so a non-author never
 * touches a cached value.
 *
 * <p><b>Privacy invariant (Gate-32):</b> non-friend reactor IDs, display
 * names, and avatars NEVER leave this service. Non-friends are surfaced
 * only as the {@code anonymousCount} integer.
 *
 * <p><b>Caching (Gate-25 / Gate-33):</b>
 * {@code @Cacheable(value = "prayer-receipt", key = "#postId")} — keyed by
 * postId alone (not viewerId). Safe because the response is author-only,
 * so a single cache entry per post serves the single user who can read it.
 * {@code ReactionWriteService.toggle/remove} carry the paired
 * {@code @CacheEvict} (Step 6).
 *
 * <p><b>TTL:</b> 30s in prod via {@code spring.cache.redis.time-to-live.prayer-receipt}.
 * In dev/test the in-memory {@code ConcurrentMapCacheManager} ignores TTL —
 * acceptable per the per-profile cache architecture documented in
 * {@link com.worshiproom.cache.CacheConfig}.
 */
@Service
public class PrayerReceiptService {

    private static final Logger log = LoggerFactory.getLogger(PrayerReceiptService.class);
    private static final String PRAYING_REACTION_TYPE = "praying";

    private final PostRepository postRepository;
    private final ReactionRepository reactionRepository;
    private final FriendRelationshipRepository friendRepository;
    private final UserRepository userRepository;

    public PrayerReceiptService(
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
     * Build the Prayer Receipt for a post. Caller must have verified author
     * identity before invocation.
     *
     * <p>Throws {@link PostNotFoundException} for missing or soft-deleted posts
     * (the soft-delete semantics match {@code PostSpecifications.visibleTo} —
     * deleted posts are invisible to everyone, including their author).
     *
     * <p>Cache key is the postId UUID (explicit SpEL — matches the paired
     * {@code @CacheEvict(key = "#postId")} on {@code ReactionWriteService}
     * so grepping for the SpEL expression surfaces both ends of the
     * invalidation contract).
     */
    @Cacheable(value = "prayer-receipt", key = "#postId")
    @Transactional(readOnly = true)
    public PrayerReceiptResponse buildReceipt(UUID postId) {
        Post post = postRepository.findById(postId)
                .filter(p -> !p.isDeleted())
                .orElseThrow(PostNotFoundException::new);

        long totalCount = post.getPrayingCount();

        // Enumerate praying reactors (UUIDs only — no PII)
        List<UUID> reactorIds = reactionRepository
                .findReactorIdsByPostIdAndReactionType(postId, PRAYING_REACTION_TYPE);

        // Author's active friends (A → B direction; Phase 2.5 stores friendships as two rows)
        Set<UUID> authorFriendIds = friendRepository
                .findAllByUserIdAndStatus(post.getUserId(), FriendRelationshipStatus.ACTIVE)
                .stream()
                .map(FriendRelationship::getFriendUserId)
                .collect(Collectors.toCollection(HashSet::new));

        // Classify reactors as friends vs anonymous (non-friend)
        List<UUID> friendReactorIds = reactorIds.stream()
                .filter(authorFriendIds::contains)
                .toList();
        long anonymousCount = (long) reactorIds.size() - friendReactorIds.size();

        // Hydrate ONLY the friend subset. Deleted/banned friends are filtered out
        // — they shouldn't appear in the receipt with their display name (and
        // are excluded by the parallel friends-list query for the same reason).
        // Sort alphabetically (case-insensitive) by resolved display name.
        List<AttributedIntercessor> attributed = friendReactorIds.isEmpty()
                ? List.of()
                : userRepository.findAllById(friendReactorIds).stream()
                        .filter(u -> !u.isDeleted() && !u.isBanned())
                        .map(u -> new AttributedIntercessor(
                                u.getId(),
                                DisplayNameResolver.resolve(u),
                                u.getAvatarUrl()))
                        .sorted(Comparator.comparing(
                                AttributedIntercessor::displayName,
                                String.CASE_INSENSITIVE_ORDER))
                        .toList();

        // If any friends were filtered out (deleted/banned), treat them as anonymous
        // for the totals invariant: totalCount == attributed.size() + anonymousCount
        long filteredOutFriends = (long) friendReactorIds.size() - attributed.size();
        anonymousCount += filteredOutFriends;

        // Safe-to-log fields ONLY — never reactor IDs, names, or avatars (W31).
        log.info("prayerReceiptBuilt postId={} totalCount={} attributedCount={} anonymousCount={}",
                postId, totalCount, attributed.size(), anonymousCount);

        return new PrayerReceiptResponse(totalCount, attributed, anonymousCount);
    }
}
