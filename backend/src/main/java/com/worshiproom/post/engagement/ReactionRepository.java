package com.worshiproom.post.engagement;

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
    // builder queries both 'praying' and 'candle' as of Spec 3.7
    // (Spec 3.4 Divergence 3 was: candle excluded — superseded).
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
}
