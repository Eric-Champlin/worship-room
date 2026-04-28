package com.worshiproom.post.engagement;

import com.worshiproom.activity.ActivityService;
import com.worshiproom.activity.ActivityType;
import com.worshiproom.activity.dto.ActivityRequest;
import com.worshiproom.post.Post;
import com.worshiproom.post.PostNotFoundException;
import com.worshiproom.post.PostRepository;
import com.worshiproom.post.PostSpecifications;
import com.worshiproom.post.engagement.dto.ToggleReactionResponse;
import jakarta.annotation.Nullable;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.UUID;

/**
 * Spec 3.7 — toggle reaction (POST) and explicit remove (DELETE) on
 * {@code /api/v1/posts/{id}/reactions}.
 *
 * <p>Toggle semantics: POST flips the (postId, userId, reactionType) row.
 * If the row exists, it's deleted ({@code state="removed"}). If it doesn't,
 * it's inserted ({@code state="added"}) and {@code INTERCESSION} fires.
 *
 * <p>DELETE is explicit — caller passes the {@code reactionType} as a query
 * param. Idempotent (204 whether the row existed or not). NO activity event.
 *
 * <p>Counter math via SQL-side UPDATE (Spec 3.7 D10). Increment ALWAYS
 * affects 1 row (we just inserted). Decrement may affect 0 rows under race
 * (the {@code > 0} guard prevents negative drift); we do NOT assert == 1 on
 * decrement because that race is benign.
 *
 * <p>NO {@code last_activity_at} bump (R9). NO crisis detection (D4).
 * NO Idempotency-Key cache (D5 — composite-key DB constraint suffices).
 */
@Service
@Transactional(readOnly = true)
public class ReactionWriteService {

    private static final Logger log = LoggerFactory.getLogger(ReactionWriteService.class);
    private static final String INTERCESSION_SOURCE_FEATURE = "prayer-wall-reaction";
    private static final String PRAYING = "praying";
    private static final String CANDLE = "candle";

    private final PostRepository postRepository;
    private final ReactionRepository reactionRepository;
    private final ReactionsRateLimitService rateLimitService;
    private final ActivityService activityService;

    public ReactionWriteService(PostRepository postRepository,
                                ReactionRepository reactionRepository,
                                ReactionsRateLimitService rateLimitService,
                                ActivityService activityService) {
        this.postRepository = postRepository;
        this.reactionRepository = reactionRepository;
        this.rateLimitService = rateLimitService;
        this.activityService = activityService;
    }

    /**
     * Toggle a reaction. Returns the post-mutation state and counters.
     *
     * @param postId        target post (must be visible to viewer)
     * @param userId        actor
     * @param reactionType  validated upstream by {@code @Pattern} —
     *                      MUST be {@code "praying"} or {@code "candle"}
     */
    @Transactional
    public ToggleReactionResponse toggle(UUID postId, UUID userId, String reactionType, String requestId) {
        rateLimitService.checkAndConsume(userId);

        loadVisiblePost(postId, userId);  // 404 if not visible / soft-deleted

        boolean exists = reactionRepository.existsByPostIdAndUserIdAndReactionType(postId, userId, reactionType);

        String state;
        if (exists) {
            // REMOVE path
            int deleted = reactionRepository.deleteByPostIdAndUserIdAndReactionType(postId, userId, reactionType);
            if (deleted == 1) {
                decrementReactionCounter(postId, reactionType);
            }
            // No activity on remove (Watch-For #12).
            state = "removed";
        } else {
            // ADD path
            reactionRepository.save(new PostReaction(postId, userId, reactionType));
            incrementReactionCounter(postId, reactionType);

            // Activity event inside the same transaction.
            activityService.recordActivity(
                    userId,
                    new ActivityRequest(ActivityType.INTERCESSION, INTERCESSION_SOURCE_FEATURE, null)
            );
            state = "added";
        }

        // Re-read the post to get post-mutation counters. The previously-loaded entity is
        // stale after the SQL-side UPDATE due to clearAutomatically=true on the @Modifying
        // queries; findById issues a fresh SELECT.
        Post refreshed = postRepository.findById(postId)
                .orElseThrow(() -> new IllegalStateException(
                        "Post disappeared mid-transaction postId=" + postId));

        log.info("reactionToggled postId={} userId={} reactionType={} state={} requestId={}",
                postId, userId, reactionType, state, requestId);

        return new ToggleReactionResponse(
                reactionType,
                state,
                refreshed.getPrayingCount(),
                refreshed.getCandleCount()
        );
    }

    /**
     * Explicit remove. Idempotent — returns silently whether row existed.
     * NO activity event (mirrors toggle-remove).
     */
    @Transactional
    public void remove(UUID postId, UUID userId, String reactionType, String requestId) {
        rateLimitService.checkAndConsume(userId);

        loadVisiblePost(postId, userId);  // 404 if not visible / soft-deleted

        int deleted = reactionRepository.deleteByPostIdAndUserIdAndReactionType(postId, userId, reactionType);
        if (deleted == 1) {
            decrementReactionCounter(postId, reactionType);
        }

        log.info("reactionRemoved postId={} userId={} reactionType={} deleted={} requestId={}",
                postId, userId, reactionType, deleted, requestId);
    }

    private Post loadVisiblePost(UUID postId, @Nullable UUID viewerId) {
        Specification<Post> spec = PostSpecifications.visibleTo(viewerId)
                .and((root, query, cb) -> cb.equal(root.get("id"), postId));
        return postRepository.findOne(spec)
                .orElseThrow(PostNotFoundException::new);
    }

    private void incrementReactionCounter(UUID postId, String reactionType) {
        if (PRAYING.equals(reactionType)) {
            postRepository.incrementPrayingCount(postId);
        } else if (CANDLE.equals(reactionType)) {
            postRepository.incrementCandleCount(postId);
        }
    }

    private void decrementReactionCounter(UUID postId, String reactionType) {
        if (PRAYING.equals(reactionType)) {
            postRepository.decrementPrayingCount(postId);
        } else if (CANDLE.equals(reactionType)) {
            postRepository.decrementCandleCount(postId);
        }
    }
}
