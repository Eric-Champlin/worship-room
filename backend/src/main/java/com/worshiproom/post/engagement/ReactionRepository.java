package com.worshiproom.post.engagement;

import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface ReactionRepository extends JpaRepository<PostReaction, PostReactionId> {

    // Returns rows for the viewer's reactions of one type — ReactionsResponse
    // builder queries 'praying', 'candle', and 'praising' as of Spec 6.6
    // (Spec 3.4 Divergence 3 was: candle excluded — superseded by Spec 3.7;
    // 'praising' added by Spec 6.6 Answered Wall).
    List<PostReaction> findByUserIdAndReactionType(UUID userId, String reactionType);

    /** Spec 3.7 — existence check for toggle/explicit-remove paths. */
    boolean existsByPostIdAndUserIdAndReactionType(UUID postId, UUID userId, String reactionType);

    /**
     * Spec 3.7 — single-statement DELETE (returns row count) for toggle and explicit-remove paths.
     *
     * <p>Spring Data's auto-derived {@code deleteBy*} methods load the entity first (SELECT,
     * then DELETE) and return {@code void}. We want one statement and the {@code int} count
     * so the service can skip the counter decrement when no row was actually deleted.
     */
    @Modifying(clearAutomatically = true, flushAutomatically = true)
    @Query("DELETE FROM PostReaction r WHERE r.postId = :postId AND r.userId = :userId AND r.reactionType = :reactionType")
    int deleteByPostIdAndUserIdAndReactionType(
            @Param("postId") UUID postId,
            @Param("userId") UUID userId,
            @Param("reactionType") String reactionType);

    /**
     * Spec 6.1 — return all user IDs that have reacted with the given type on a post.
     * Used by {@link com.worshiproom.post.PrayerReceiptService} to enumerate praying
     * reactors so the service can classify them friend-vs-non-friend.
     *
     * <p>Returns IDs only — no user-data hydration here (the service hydrates only the
     * friend subset to enforce the Gate-32 privacy invariant: non-friend identities
     * never leave the service).
     */
    @Query("SELECT r.userId FROM PostReaction r WHERE r.postId = :postId AND r.reactionType = :reactionType")
    List<UUID> findReactorIdsByPostIdAndReactionType(
            @Param("postId") UUID postId,
            @Param("reactionType") String reactionType);

    /**
     * Spec 6.5 — fetch reactions of a given type for a post, sorted by reactedAt DESC
     * with deterministic tiebreak on userId ASC. Capped via Pageable (50 for the
     * Intercessor Timeline endpoint).
     *
     * <p>Returns full PostReaction entities so the service layer can read userId
     * + createdAt without a second hop. Tiebreaker on userId ASC is deterministic
     * because (post_id, user_id, reaction_type) is the composite PK — for a single
     * (post_id, reaction_type) pair, user_id is unique.
     */
    @Query("SELECT r FROM PostReaction r WHERE r.postId = :postId AND r.reactionType = :reactionType "
         + "ORDER BY r.createdAt DESC, r.userId ASC")
    List<PostReaction> findByPostIdAndReactionTypeOrderByCreatedAtDescUserIdAsc(
            @Param("postId") UUID postId,
            @Param("reactionType") String reactionType,
            Pageable pageable);

    /**
     * Spec 6.5 — top-N reactions per post for a page of post IDs (used by feed-endpoint
     * intercessorSummary firstThree). Native SQL with window function — JPQL has no
     * ROW_NUMBER() OVER (PARTITION BY ...) support.
     *
     * <p>Returns rows as a {@link ReactionTopProjection}: (post_id, user_id, created_at).
     * Service layer groups by post_id and classifies each entry against the viewer's
     * friend set. Tiebreaker (user_id ASC) matches the dedicated-endpoint sort.
     *
     * <p>The window-function partition predicate is satisfied by the existing
     * {@code idx_post_reactions_post_type} index on {@code (post_id, reaction_type)}.
     */
    @Query(value = """
        SELECT post_id, user_id, created_at
        FROM (
          SELECT post_id, user_id, created_at,
                 ROW_NUMBER() OVER (PARTITION BY post_id ORDER BY created_at DESC, user_id) AS rn
          FROM post_reactions
          WHERE post_id IN :postIds AND reaction_type = :reactionType
        ) ranked
        WHERE rn <= :n
        """, nativeQuery = true)
    List<ReactionTopProjection> findTopNPerPost(
            @Param("postIds") List<UUID> postIds,
            @Param("reactionType") String reactionType,
            @Param("n") int n);
}
