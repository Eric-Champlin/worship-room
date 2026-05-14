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
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.UUID;

/**
 * Spec 3.7 + 6.6 — toggle reaction (POST) and explicit remove (DELETE) on
 * {@code /api/v1/posts/{id}/reactions}.
 *
 * <p>Toggle semantics: POST flips the (postId, userId, reactionType) row.
 * If the row exists, it's deleted ({@code state="removed"}). If it doesn't,
 * it's inserted ({@code state="added"}).
 *
 * <p><b>INTERCESSION activity event fires on praying-add ONLY.</b> Candle
 * and praising adds deliberately do NOT fire {@code INTERCESSION}. Both are
 * social signals on a Prayer Wall post, but neither is intercession:
 * "Light a Candle" is silent remembrance/solidarity, and "Praising with you"
 * (Spec 6.6) is celebration of an answered prayer. Re-using the
 * {@code INTERCESSION} activity event for either would miscategorize them
 * and inflate downstream counters (faith points, the 25-intercessions
 * badge eligibility). The pre-6.6 implementation fired INTERCESSION on every
 * reaction-add — Spec 6.6 corrected that drift (see the inline comment at
 * the conditional below for the per-call-site rule).
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
    private static final String PRAISING = "praising";

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
     * <p>Spec 6.1 (Gate-33): {@code @CacheEvict} on the {@code prayer-receipt}
     * cache fires when this method returns successfully. Spring's default
     * {@code beforeInvocation = false} means eviction happens AFTER the
     * transaction commits — there is a microsecond race window between
     * commit and eviction where a concurrent {@code GET /prayer-receipt}
     * could serve the prior cache entry. With a 30s TTL and atomic
     * insert+counter update inside the transaction, the practical staleness
     * floor is bounded by the Spring proxy unwind time (≪ 1ms in typical
     * deploys). The spec's "atomic" framing refers to this end-to-end
     * commit-then-evict sequence; true within-transaction eviction would
     * require {@code beforeInvocation = true} (which we deliberately do NOT
     * use because a transaction rollback would then leave the cache in a
     * stale state worse than the current behavior).
     *
     * @param postId        target post (must be visible to viewer)
     * @param userId        actor
     * @param reactionType  validated upstream by {@code @Pattern} —
     *                      MUST be {@code "praying"}, {@code "candle"}, or
     *                      {@code "praising"} (Spec 6.6 widened the set)
     */
    @Transactional
    @CacheEvict(value = "prayer-receipt", key = "#postId")
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

            // INTERCESSION fires for praying-add ONLY. Candle and praising are
            // deliberately excluded — candle is silent remembrance, praising is
            // celebration of an answered prayer (Spec 6.6). Neither is
            // intercession, and re-using INTERCESSION for them would
            // miscategorize them and inflate the 25-intercessions badge
            // eligibility + downstream faith points. This is a Spec 6.6
            // correction of pre-existing drift from Spec 3.7, which fired
            // INTERCESSION on every reaction-add. Do NOT "helpfully"
            // re-generalize this conditional in a future refactor.
            if (PRAYING.equals(reactionType)) {
                activityService.recordActivity(
                        userId,
                        new ActivityRequest(ActivityType.INTERCESSION, INTERCESSION_SOURCE_FEATURE, null)
                );
            }
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
                refreshed.getCandleCount(),
                refreshed.getPraisingCount()
        );
    }

    /**
     * Explicit remove. Idempotent — returns silently whether row existed.
     * NO activity event (mirrors toggle-remove).
     */
    @Transactional
    @CacheEvict(value = "prayer-receipt", key = "#postId")
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
        } else if (PRAISING.equals(reactionType)) {
            postRepository.incrementPraisingCount(postId);
        }
    }

    private void decrementReactionCounter(UUID postId, String reactionType) {
        if (PRAYING.equals(reactionType)) {
            postRepository.decrementPrayingCount(postId);
        } else if (CANDLE.equals(reactionType)) {
            postRepository.decrementCandleCount(postId);
        } else if (PRAISING.equals(reactionType)) {
            postRepository.decrementPraisingCount(postId);
        }
    }
}
